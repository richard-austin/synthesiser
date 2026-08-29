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

      for (let b = 0; b < this.numberOfBanks * 2; b++) {
        const ptr = Module._malloc(samplesPerBlock * bytesPerFloat);
        Module.HEAPF32.fill(0, ptr / bytesPerFloat, (ptr / bytesPerFloat) + samplesPerBlock);
        this.channelPtrs.push(ptr);
      }

      this.wasmOutputPtrArray = Module._malloc(this.numberOfBanks * 2 * bytesPerFloat);
      for (let b = 0; b < this.numberOfBanks * 2; b++) {
        Module.HEAP32[(this.wasmOutputPtrArray / 4) + b] = this.channelPtrs[b];
      }
      console.log("Memory marshalling arrays allocated successfully on WASM heap.");
    }

    handleIncomingMessage(data) {
      if (!data) return;
      //     console.log("AudioWorklet received control type:", data.type);

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
            //     console.log("C-Engine Note On executed for key:", data.key);
          }
          break;
        case 'keyUp':
          if (this.isWasmBound) Module._triggerNoteOff(data.key);
          break;
        case 'tuning':
          if (this.isWasmBound) Module._setBankTuning(data.bank, data.tuning);
          break;
        case 'detune':
          if (this.isWasmBound) Module._setBankDetune(data.bank, data.detune);
          break;
        case "setVelocitySensitive":
          if (this.isWasmBound) Module._setVelocitySensitive(data.bank, data.velocitySensitive);
          break;
        case 'envelope':
          if (this.isWasmBound) Module._setBankEnvelopeParams(data.bank, data.phase, data.value);
          break;
        case 'pitchEnvelope':
          if (this.isWasmBound) Module._setBankPitchEnvelopeParams(data.bank, data.phase, data.value);
          break;
        case 'filterTuning':
          if (this.isWasmBound) Module._setFilterTuning(data.bank, data.filterTuning);
          break;
        case 'filterDetune':
          if (this.isWasmBound) Module._setFilterDetune(data.bank, data.filterDetune);
          break;
        case 'filterQFactor':
          if (this.isWasmBound) Module._setFilterQFactor(data.bank, data.filterQFactor);
          break;
        case 'filterPitchEnvelope':
          if (this.isWasmBound) Module._setBankFilterPitchEnvelopeParams(data.bank, data.phase, data.value);
          break;
        case 'usePitchEnvelope':
          if (this.isWasmBound) Module._usePitchEnvelope(data.bank, data.value);
          break;
        case 'useFilterPitchEnvelope':
          if (this.isWasmBound) Module._useFilterPitchEnvelope(data.bank, data.value);
          break;
        case 'outputToFilter':
          if (this.isWasmBound) Module._outputToFilter(data.bank, data.outputToFilter);
          break;
        case 'useFilter':
          if (this.isWasmBound) Module._useFilter(data.bank, data.useFilter);
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
        case 'setModOutput':
          if (this.isWasmBound) {
            const typeVal = data.modOutput === 'direct' ? 1 : (data.modOutput === 'envelope' ? 2 : 0);
            Module._setModOutput(data.modBank, typeVal);
          }
          break;
        case 'setLFOModType':
          if (this.isWasmBound) {
            const modType = data.modType;
            const typeVal = modType === 'amplitude' ? 1 : modType === 'frequency' ? 2 : 3;
            Module._setLFOModType(data.bank, typeVal);
          }
          break;
        case 'setLFOWaveform':
          if (this.isWasmBound) {
            const waveform = data.waveform;
            const typeVal = waveform === 'sine' ? 1 : waveform === 'trangle' ? 2 : waveform === 'square' ? 3 : waveform === 'sawtooth' ? 4 : 0;
            Module._setLFOWaveform(data.bank, typeVal);
          }
          break;
        case 'setLFOLevel':
          if (this.isWasmBound) {
            const levelVal = data.level;
            Module._setLFOLevel(data.bank, levelVal);
          }
          break;
        case 'setLFOFrequency':
          if (this.isWasmBound) {
            const frequency = data.frequency;
            Module._setLFOFrequency(data.bank, frequency);
          }
          break;
        case 'setOscillatorLevel':
          if (this.isWasmBound) {
            Module._setOscillatorLevel(data.bank, data.oscillatorLevel);
          }
          break;
        case 'setFilterLevel':
          if (this.isWasmBound) {
            Module._setFilterLevel(data.bank, data.filterLevel);
          }
          break;
        case 'setFilterMorphMode':
          if (this.isWasmBound) {
            Module._setFilterMorphMode(data.bank, data.filterMorphMode);
          }
          break;
        default:
          console.error("Unknown control type " + type);
          break;
      }
    }

    iterationCount = 0;
    totalTime = 0;
    maxTime = 0;
    minTime = 0;

    process(inputs, outputs, parameters) {
      // const start = Date.now();

      if (!this.isEngineRunning) return false;
      if (!this.isWasmBound) return true;
      const output = outputs[0];
      const op = output[0];
      const samplesPerBlock = op.length;

      Module._processBlock(this.wasmOutputPtrArray, samplesPerBlock);

      for (let b = 0; b < this.numberOfBanks * 2; b++) {
        const outputChannelData = outputs[b][0];
        if (!outputChannelData) continue;
        const startFloatIdx = this.channelPtrs[b] / 4;
        const wasmFloatView = Module.HEAPF32.subarray(startFloatIdx, startFloatIdx + samplesPerBlock);
        outputChannelData.set(wasmFloatView);
      }
      // const time = (Date.now() - start);
      // this.totalTime += time
      // this.iterationCount++;
      // if (time > this.maxTime)
      //   this.maxTime = time;
      // if (time < this.minTime)
      //   this.minTime = time;
      // //  Send an average performance report every 500 blocks (~1.5 seconds)
      // if (this.iterationCount >= 500) {
      //   const averageMsPerBlock = this.totalTime / this.iterationCount;
      //   console.log("averageMsPerBlock = " + averageMsPerBlock + " maxTime = " + this.maxTime + " minTime = "+ this.minTime);
      //   //this.port.postMessage({ type: 'perf-report', averageMsPerBlock });
      //
      //   this.totalTime = 0;
      //   this.iterationCount = 0;
      //   this.maxTime = 0;
      //   this.minTime = 100;
      // }

      return true;
    }
  }

  // Clean up global scope registration by leaving it strictly to the class instance lifecycle
  globalThis.registerProcessor('oscillator', WasmSynthesiserProcessor);
}
