// src/assets/wasm/audio-processor.js
import createEngineModule from './engine-module.js';

registerProcessor('oscillator', class WasmOscillatorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.running = true;
    this.wasmEngine = null;

    const opts = options.processorOptions;
    this.numberOfBanks = opts.numberOfBanks;
    this.oscillatorsPerBank = opts.oscillatorsPerBank;
    this.waveTableSize = opts.waveTableSize;
    this.startFx = opts.startFx;

    // Initialize Emscripten instance using its own generated loader
    this.initWasm();
    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  async initWasm() {
    // Emscripten-generated function automatically handles WASM Worker orchestration
    // and safely sets up the SharedArrayBuffer memory layout
    this.wasmEngine = await createEngineModule({
      mainScriptUrlOrBlob: './engine-module.js'
    });

    // Fire initialization structure metrics directly into compiled C code
    this.wasmEngine._initProcessor(
      this.numberOfBanks,
      this.oscillatorsPerBank,
      this.waveTableSize,
      this.startFx,
      sampleRate
    );
  }

  handleMessage(data) {
    if (!this.wasmEngine) return;

    switch (data.type) {
      case 'shutDown':
        this.running = false;
        this.port.close();
        break;
      case 'keyDown':
        this.wasmEngine._triggerNoteOn(data.key, data.velocity);
        break;
      case 'keyUp':
        this.wasmEngine._triggerNoteOff(data.key);
        break;
      case 'envelope':
        this.wasmEngine._setBankEnvelopeParams(data.bank, data.phase, data.value);
        break;
      case 'setModType':
        const typeVal = data.modType === 'frequency' ? 1 : (data.modType === 'amplitude' ? 2 : 0);
        this.wasmEngine._setMatrixGain(data.modBank, data.carrierBank, typeVal, 1.0);
        break;
      case 'setModLevel':
        this.wasmEngine._setMatrixGain(data.modBank, data.carrierBank, 1, data.modLevel);
        break;
    }
  }

  process(inputs, outputs, parameters) {
    if (!this.wasmEngine || !this.running) return true;

    // Emscripten exposes exported methods prefixed with underscores natively on its context
    this.wasmEngine._processBlock(outputs, outputs.length);
    return true;
  }
});
