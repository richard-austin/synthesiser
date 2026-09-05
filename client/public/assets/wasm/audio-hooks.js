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

      // 4 Oscillator Banks + 4 Filter Banks = 8 Banks total.
      // With 2 channels each, we need 16 total discrete float pointers.
      const totalChannels = this.numberOfBanks * 2 * 2;

      for (let b = 0; b < totalChannels; b++) {
        const ptr = Module._malloc(samplesPerBlock * bytesPerFloat);
        Module.HEAPF32.fill(0, ptr / bytesPerFloat, (ptr / bytesPerFloat) + samplesPerBlock);
        this.channelPtrs.push(ptr);
      }

      // Allocate pointer array large enough to hold all 16 pointer addresses
      this.wasmOutputPtrArray = Module._malloc(totalChannels * bytesPerFloat);
      for (let b = 0; b < totalChannels; b++) {
        Module.HEAP32[(this.wasmOutputPtrArray / 4) + b] = this.channelPtrs[b];
      }
      console.log("Memory marshalling arrays allocated successfully on WASM heap for Stereo.");
    }

    handleIncomingMessage(data) {
      if (!data) return;
      //     console.log("AudioWorklet received control type:", data.type);

      switch (data.type) {
        case 'init':
          if (this.isWasmBound && typeof Module._initProcessor === 'function') {
            Module._initProcessor(this.numberOfBanks, this.oscillatorsPerBank, 2048, 21, 20.0, sampleRate);
            console.log("C-Memory maps allocated successfully.");
          }
          break;
        case 'shutDown':
          this.isEngineRunning = false;
          this.port.close();
          if (this.wasmOutputPtrArray !== 0) {
            for (let p of this.channelPtrs) Module._free(p);
            Module._free(this.wasmOutputPtrArray);
            for (let b = 0; b < 4000; b++) {
              console.log("Shutdown successfully.");
            }
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
        case 'periodicWave':
          if (this.isWasmBound) {
            Module._setNumberOfBands(data.numberOfBands);
            const ptr = Module._allocateWaveTableMemory(data.bank);  // Allocate memory if not already done. Allow 4 bytes per float
            const heapIndex = ptr >> 2;  // 4 bytes per float
            Module.HEAPF32.set(data.waveTables, heapIndex);
          }
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
        case 'setPortamentoTime':
          if(this.isWasmBound) Module._setPortamentoTime(data.bank, data.time);
          break;
        case 'envelope':
          if (this.isWasmBound) Module._setBankEnvelopeParams(data.bank, data.phase, data.value);
          break;
        case 'portamento':
          if(this.isWasmBound) Module._setPortamento(data.bank, data.time);
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
        case 'lfoPeriodicWave':
          if (this.isWasmBound) {
            Module._setNumberOfBands(data.numberOfBands);
            const ptr = Module._allocateLFOWaveTableMemory(data.bank);  // Allocate memory if not already done. Allow 4 bytes per float
            const heapIndex = ptr >> 2;  // 4 bytes per float
            Module.HEAPF32.set(data.waveTables, heapIndex);
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
        case 'setFilterLFOModType':
          if (this.isWasmBound) {
            const modType = data.modType;
            const typeVal = modType === 'amplitude' ? 1 : modType === 'frequency' ? 2 : 3;
            Module._setFilterLFOModType(data.bank, typeVal);
          }
          break;
        case 'filterLFOPeriodicWave':
          if (this.isWasmBound) {
            Module._setNumberOfBands(data.numberOfBands);
            const ptr = Module._allocateFilterLFOWaveTableMemory(data.bank);  // Allocate memory if not already done. Allow 4 bytes per float
            const heapIndex = ptr >> 2;  // 4 bytes per float
            Module.HEAPF32.set(data.waveTables, heapIndex);
          }
          break;
        case 'setFilterLFOLevel':
          if (this.isWasmBound) {
            const levelVal = data.level;
            Module._setFilterLFOLevel(data.bank, levelVal);
          }
          break;
        case 'setFilterLFOFrequency':
          if (this.isWasmBound) {
            const frequency = data.frequency;
            Module._setFilterLFOFrequency(data.bank, frequency);
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
        case 'setBankPan':
          if (this.isWasmBound) {
            Module._setBankPan(data.bank, data.pan);
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
      const start = Date.now();
      if (!this.isEngineRunning) return false;
      if (!this.isWasmBound) return true;

      // Derive block constraints dynamically from the hardware target window
      const samplesPerBlock = outputs[0] && outputs[0][0] ? outputs[0][0].length : 128;

      // Run the C module engine step over the continuous memory heap
      Module._processBlock(this.wasmOutputPtrArray, samplesPerBlock);

      const totalBanks = this.numberOfBanks * 2; // 4 Osc banks + 4 Filter banks

      for (let b = 0; b < totalBanks; b++) {
        if (!outputs[b]) continue;

        // TARGET NESTED INNER CHANNELS: [0] is Left, [1] is Right
        const leftChannelData = outputs[b][0];
        const rightChannelData = outputs[b][1];

        // Retrieve the flat, linear pointer mapping indices from our array
        const leftPtrIdx = b * 2;
        const rightPtrIdx = (b * 2) + 1;

        // Marshal Left Channel Data
        if (leftChannelData) {
          const startFloatIdx = this.channelPtrs[leftPtrIdx] / 4;
          const wasmFloatView = Module.HEAPF32.subarray(startFloatIdx, startFloatIdx + samplesPerBlock);
          leftChannelData.set(wasmFloatView);
        }

        // Marshal Right Channel Data
        if (rightChannelData) {
          const startFloatIdx = this.channelPtrs[rightPtrIdx] / 4;
          const wasmFloatView = Module.HEAPF32.subarray(startFloatIdx, startFloatIdx + samplesPerBlock);
          rightChannelData.set(wasmFloatView);
        }
      }

      const time = (Date.now() - start);
      this.totalTime += time
      this.iterationCount++;
      if (time > this.maxTime)
        this.maxTime = time;
      if (time < this.minTime)
        this.minTime = time;
      //  Send an average performance report every 500 blocks (~1.5 seconds)
      if (this.iterationCount >= 500) {
        const averageMsPerBlock = this.totalTime / this.iterationCount;
        console.log("averageMsPerBlock = " + averageMsPerBlock + " maxTime = " + this.maxTime + " minTime = " + this.minTime);
        //this.port.postMessage({ type: 'perf-report', averageMsPerBlock });

        this.totalTime = 0;
        this.iterationCount = 0;
        this.maxTime = 0;
        this.minTime = 100;
      }

      return true;
    }
  }

  // Clean up global scope registration by leaving it strictly to the class instance lifecycle
  globalThis.registerProcessor('oscillator', WasmSynthesiserProcessor);
}
