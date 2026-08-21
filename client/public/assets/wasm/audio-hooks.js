// client/public/assets/wasm/audio-hooks.js

if (typeof globalThis.registerProcessor === 'function') {
  class WasmSynthesiserProcessor extends AudioWorkletProcessor {
    constructor(options) {
      super();
      this.isEngineRunning = true;
      this.isWasmBound = false;

      const opts = options.processorOptions;
      this.numberOfBanks = opts.numberOfBanks;
      this.oscillatorsPerBank = opts.oscillatorsPerBank;
      this.wasmOutputPtrArray = 0;
      this.channelPtrs = [];

      this.port.onmessage = (e) => {
        this.handleIncomingMessage(e.data);
      };

      // Fix: Check if WASM is already loaded or wait for it
      this.initializeWasmConnection();
    }

    initializeWasmConnection() {
      if (typeof Module === 'undefined') return;

      // Scenario A: Runtime is already fully loaded and active
      if (Module.calledRun || (typeof Module._malloc === 'function' && Module.HEAPF32)) {
        this.bindEngine();
      } else {
        // Scenario B: Runtime is still booting up asynchronously
        const existingCallback = Module.onRuntimeInitialized;
        Module.onRuntimeInitialized = () => {
          if (typeof existingCallback === 'function') existingCallback();
          this.bindEngine();
        };
      }
    }

    bindEngine() {
      console.log("WASM Runtime verified inside AudioWorklet scope. Configuring buffers...");
      this.allocateWasmBuffers();
      this.isWasmBound = true;
    }

    allocateWasmBuffers() {
      if (this.wasmOutputPtrArray !== 0) return;
      const samplesPerBlock = 128;
      const bytesPerFloat = 4;
      this.channelPtrs = [];

      for (let b = 0; b < this.numberOfBanks; b++) {
        const ptr = Module._malloc(samplesPerBlock * bytesPerFloat);
        Module.HEAPF32.fill(0, ptr / bytesPerFloat, (ptr / bytesPerFloat) + samplesPerBlock);
        this.channelPtrs.push(ptr);
      }

      this.wasmOutputPtrArray = Module._malloc(this.numberOfBanks * bytesPerFloat);
      for (let b = 0; b < this.numberOfBanks; b++) {
        Module.HEAP32[(this.wasmOutputPtrArray / 4) + b] = this.channelPtrs[b];
      }
      console.log("Memory marshalling arrays allocated successfully on WASM heap.");
    }

    handleIncomingMessage(data) {
      if (!data) return;
      console.log("AudioWorklet received control type:", data.type);

      switch (data.type) {
        case 'init':
          if (this.isWasmBound && typeof Module._initProcessor === 'function') {
            Module._initProcessor(this.numberOfBanks, this.oscillatorsPerBank, 2048, 20.0, sampleRate);
            console.log("C-Memory maps allocated successfully.");
          }
          break;
        case 'shutDown':
          this.isEngineRunning = false;
          this.port.close();
          if (this.wasmOutputPtrArray !== 0) {
            for (let p of this.channelPtrs) Module._free(p);
            Module._free(this.wasmOutputPtrArray);
          }
          break;
        case 'keyDown':
          if (this.isWasmBound) {
            Module._triggerNoteOn(data.key, data.velocity);
            console.log("C-Engine Note On executed for key:", data.key);
          }
          break;
        case 'keyUp':
          if (this.isWasmBound) Module._triggerNoteOff(data.key);
          break;
        case 'tuning':
          if(this.isWasmBound) Module._setBankTuning(data.bank, data.tuning);
          break;
        case 'detune':
          if(this.isWasmBound) Module._setBankDetune(data.bank, data.detune);
          break;
        case 'envelope':
          if (this.isWasmBound) Module._setBankEnvelopeParams(data.bank, data.phase, data.value);
          break;
        case 'setModType': {
          if (this.isWasmBound) {
            const typeVal = data.modType === 'frequency' ? 1 : (data.modType === 'amplitude' ? 2 : 0);
            Module._setModType(data.modBank, data.carrierBank, typeVal);
          }
          break;
        }
        case 'setModLevel':
          if (this.isWasmBound) Module._setModLevel(data.modBank, data.carrierBank, data.modLevel);
          break;
      }
    }

    process(inputs, outputs, parameters) {
      if (!this.isEngineRunning) return false;
      if (!this.isWasmBound) return true;

      const samplesPerBlock = 128;
      Module._processBlock(this.wasmOutputPtrArray, samplesPerBlock);

      for (let b = 0; b < this.numberOfBanks; b++) {
        const outputChannelData = outputs[b][0];
        if (!outputChannelData) continue;
        const startFloatIdx = this.channelPtrs[b] / 4;
        const wasmFloatView = Module.HEAPF32.subarray(startFloatIdx, startFloatIdx + samplesPerBlock);
        outputChannelData.set(wasmFloatView);
      }
      return true;
    }
  }

  // Clean up global scope registration by leaving it strictly to the class instance lifecycle
  globalThis.registerProcessor('oscillator', WasmSynthesiserProcessor);
}
