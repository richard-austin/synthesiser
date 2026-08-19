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

      // Direct assignment onto the message port ensures the loop activates instantly
      this.port.onmessage = (e) => {
        this.handleIncomingMessage(e.data);
      };

      // Capture the runtime initialization status hook
      if (typeof Module !== 'undefined') {
        Module.onRuntimeInitialized = () => {
          console.log("WASM Runtime initialized inside AudioWorklet scope. Configuring buffers...");
          this.allocateWasmBuffers();
          this.isWasmBound = true;
        };
      }
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
      console.log("AudioWorklet received control type:", data.type); // Diagnoses execution paths

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
        case 'envelope':
          if (this.isWasmBound) Module._setBankEnvelopeParams(data.bank, data.phase, data.value);
          break;
        case 'setModType': {
          if (this.isWasmBound) {
            const typeVal = data.modType === 'frequency' ? 1 : (data.modType === 'amplitude' ? 2 : 0);
            Module._setMatrixGain(data.modBank, data.carrierBank, typeVal, 1.0);
          }
          break;
        }
        case 'setModLevel':
          if (this.isWasmBound) Module._setMatrixGain(data.modBank, data.carrierBank, 1, data.modLevel);
          break;
      }
    }

    process(inputs, outputs, parameters) {
      // Ensure the processing loop stays alive and renders frames continuously
      if (!this.isEngineRunning) return false;
      if (!this.isWasmBound) return true; // Keep thread warm while waiting for WASM to mount
console.log("x");
      const samplesPerBlock = 128;

      // 1. Process samples inside the optimized C engine block
      Module._processBlock(this.wasmOutputPtrArray, samplesPerBlock);

      // 2. Marshal float data views directly back into Web Audio output tracks
      for (let b = 0; b < this.numberOfBanks; b++) {
        const outputChannelData = outputs[b][0]; // Extract Bank B, Channel 0 (Mono standard track mapping)
        if (!outputChannelData) continue;

        const startFloatIdx = this.channelPtrs[b] / 4;
        const wasmFloatView = Module.HEAPF32.subarray(startFloatIdx, startFloatIdx + samplesPerBlock);

        outputChannelData.set(wasmFloatView);
      }

      return true;
    }
  }

  globalThis.registerProcessor('oscillator', WasmSynthesiserProcessor);
}
