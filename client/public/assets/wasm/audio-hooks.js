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
      const totalChannels = this.numberOfBanks * 2 * 2 + 2; // Two per oscillator bank, two per filter bank plus two for the noise generator

      for (let c = 0; c < totalChannels; c++) {
        const ptr = Module._malloc(samplesPerBlock * bytesPerFloat);
        Module.HEAPF32.fill(0, ptr / bytesPerFloat, (ptr / bytesPerFloat) + samplesPerBlock);
        this.channelPtrs.push(ptr);
      }

      // Allocate pointer array large enough to hold all 16 pointer addresses
      this.wasmOutputPtrArray = Module._malloc(totalChannels * bytesPerFloat);
      for (let c = 0; c < totalChannels; c++) {
        Module.HEAP32[(this.wasmOutputPtrArray / 4) + c] = this.channelPtrs[c];
      }
      console.log("Memory marshalling arrays allocated successfully on WASM heap for Stereo.");
    }

    handleIncomingMessage(data) {
      if (!data) return;
      switch (data.type) {
        case 'init':
          if (this.isWasmBound && typeof Module._initProcessor === 'function') {
            Module._initProcessor(this.numberOfBanks, this.oscillatorsPerBank, 2048, 21, 20.0, sampleRate);
            console.log("C-Memory maps allocated successfully.");
          }
          return;
        case 'shutDown':
          this.isEngineRunning = false;
          this.port.close();
          if (this.wasmOutputPtrArray !== 0) {
            for (let p of this.channelPtrs) Module._free(p);
            Module._free(this.wasmOutputPtrArray);
          }
          return;
        default:
          break;
      }
      if (this.isWasmBound) {
        switch (data.type) {
          case 'keyDown':
            Module._triggerNoteOn(data.key, data.velocity);
            //     console.log("C-Engine Note On executed for key:", data.key);
            break;
          case 'keyUp':
            Module._triggerNoteOff(data.key);
            break;
          case 'periodicWave':
            Module._setNumberOfBands(data.numberOfBands);
            const ptr = Module._allocateWaveTableMemory(data.bank);  // Allocate memory if not already done. Allow 4 bytes per float
            const heapIndex = ptr >> 2;  // 4 bytes per float
            Module.HEAPF32.set(data.waveTables, heapIndex);
            break;
          case 'tuning':
            Module._setBankTuning(data.bank, data.tuning);
            break;
          case 'detune':
            Module._setBankDetune(data.bank, data.detune);
            break;
          case "setVelocitySensitive":
            Module._setVelocitySensitive(data.bank, data.velocitySensitive);
            break;
          case 'setPortamentoTime':
            Module._setPortamentoTime(data.bank, data.time);
            break;
          case 'envelope':
            Module._setBankEnvelopeParams(data.bank, data.phase, data.value);
            break;
          case 'portamento':
            Module._setPortamento(data.bank, data.time);
            break;
          case 'filterPortamento':
            Module._setFilterPortamento(data.bank, data.time);
            break;
          case 'pitchEnvelope':
            Module._setBankPitchEnvelopeParams(data.bank, data.phase, data.value);
            break;
          case 'filterTuning':
            Module._setFilterTuning(data.bank, data.filterTuning);
            break;
          case 'filterDetune':
            Module._setFilterDetune(data.bank, data.filterDetune);
            break;
          case 'filterQFactor':
            Module._setFilterQFactor(data.bank, data.filterQFactor);
            break;
          case 'filterPitchEnvelope':
            Module._setBankFilterPitchEnvelopeParams(data.bank, data.phase, data.value);
            break;
          case 'usePitchEnvelope':
            Module._usePitchEnvelope(data.bank, data.value);
            break;
          case 'useFilterPitchEnvelope':
            Module._useFilterPitchEnvelope(data.bank, data.value);
            break;
          case 'outputToFilter':
            Module._outputToFilter(data.bank, data.outputToFilter);
            break;
          case 'useFilter':
            Module._useFilter(data.bank, data.useFilter);
            break;
          case 'setModType': {
            const typeVal = data.modType === 'frequency' ? 1 : (data.modType === 'amplitude' ? 2 : 0);
            Module._setModType(data.modBank, data.carrierBank, typeVal);
          }
            break;
          case 'setModLevel':
            Module._setModLevel(data.modBank, data.carrierBank, data.modLevel);
            break;
          case 'setModOutput':
          {
            const typeVal = data.modOutput === 'direct' ? 1 : (data.modOutput === 'envelope' ? 2 : 0);
            Module._setModOutput(data.modBank, typeVal);
          }
            break;
          case 'setLFOModType':
          {
            const modType = data.modType;
            const typeVal = modType === 'amplitude' ? 1 : modType === 'frequency' ? 2 : 3;
            Module._setLFOModType(data.bank, typeVal);
          }
            break;
          case 'lfoPeriodicWave':
          {
            Module._setNumberOfBands(data.numberOfBands);
            const ptr = Module._allocateLFOWaveTableMemory(data.bank);  // Allocate memory if not already done. Allow 4 bytes per float
            const heapIndex = ptr >> 2;  // 4 bytes per float
            Module.HEAPF32.set(data.waveTables, heapIndex);
          }
            break;
          case 'setLFOLevel':
          {
            const levelVal = data.level;
            Module._setLFOLevel(data.bank, levelVal);
          }
            break;
          case 'setLFOFrequency':
          {
            const frequency = data.frequency;
            Module._setLFOFrequency(data.bank, frequency);
          }
            break;
          case 'setFilterLFOModType':
          {
            const modType = data.modType;
            const typeVal = modType === 'amplitude' ? 1 : modType === 'frequency' ? 2 : 3;
            Module._setFilterLFOModType(data.bank, typeVal);
          }
            break;
          case 'filterLFOPeriodicWave':
          {
            Module._setNumberOfBands(data.numberOfBands);
            const ptr = Module._allocateFilterLFOWaveTableMemory(data.bank);  // Allocate memory if not already done. Allow 4 bytes per float
            const heapIndex = ptr >> 2;  // 4 bytes per float
            Module.HEAPF32.set(data.waveTables, heapIndex);
          }
            break;
          case 'setFilterLFOLevel':
          {
            const levelVal = data.level;
            Module._setFilterLFOLevel(data.bank, levelVal);
          }
            break;
          case 'setFilterLFOFrequency':
          {
            const frequency = data.frequency;
            Module._setFilterLFOFrequency(data.bank, frequency);
          }
            break;
          case 'setOscillatorLevel':
            Module._setOscillatorLevel(data.bank, data.oscillatorLevel);
            break;
          case 'setFilterLevel':
            Module._setFilterLevel(data.bank, data.filterLevel);
            break;
          case 'setBankPan':
            Module._setBankPan(data.bank, data.pan);
            break;
          case 'setFilterMorphMode':
            Module._setFilterMorphMode(data.bank, data.filterMorphMode);
            break;
          case 'noiseEnvelope':
            Module._setNoiseEnvelopeParams(data.phase, data.value);
            break;
          case 'setNoiseVelocitySensitive':
            Module._setNoiseVelocitySensitive(data.velocitySensitive);
            break;
          case 'setNoiseGain':
            Module._setNoiseGain(data.gain);
            break;
          case 'setNoiseType':
            const type = data.noiseType === 'white' ? 0 : data.noiseType === 'pink' ? 1 : data.noiseType === 'brown' ? 2 : 0;
            Module._setNoiseType(type)
            break;
          case 'noiseConnectToMasterVolume':
            Module._noiseConnectToMasterVolume();
            break;
          case 'noiseConnectToFilter':
            Module._noiseConnectToFilter();
            break;
          case 'noiseOff':
            Module._noiseOff(data.isOff);
            break;
          case 'phaserSetFrequency':
            Module._setPhaserFreuency(data.freq);
            break;
          case 'phaserSetQ':
            Module._setPhaserQ(data.q);
            break;
          case 'phaserSetWetDry':
            Module._setPhaserWetDry(data.wetDry);
            break;
          case 'phaserSetStages':
            Module._setPhaserStages(data.stages);
            break;
          default:
            console.error("Unknown control type " + data.type);
            break;
        }
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

      const totalBanks = this.numberOfBanks * 2 + 1; // 4 Osc banks + 4 Filter banks + 1 noise bank

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
      //   console.log("averageMsPerBlock = " + averageMsPerBlock + " maxTime = " + this.maxTime + " minTime = " + this.minTime);
      //   //this.port.postMessage({ type: 'perf-report', averageMsPerBlock });
      //
      //   this.totalTime = 0;
      //   this.iterationCount = 0;
      //   this.maxTime = 0;
      //   this.minTime = 100;
      // }
      //
      return true;
    }
  }

  // Clean up global scope registration by leaving it strictly to the class instance lifecycle
  globalThis.registerProcessor('oscillator', WasmSynthesiserProcessor);
}
