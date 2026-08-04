// Declare the ambient browser-injected audio worklet globals for the TypeScript compiler
declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;

  public abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

declare const sampleRate: number; // This also simplifies your sample rate reading!

// Define explicit interfaces for the WebAssembly functions exposed by our C module
interface FMSynthWasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  initProcessor: (sampleRate: number) => void;
  setMatrixGain: (sourceBank: number, targetBank: number, gain: number, isAM: boolean) => void;
  setBankEnvelopeParams: (bank: number, isFrequencyEnv: boolean, a: number, d: number, s: number, r: number) => void;
  triggerNoteOn: (bank: number, noteNumber: number, frequency: number) => void;
  triggerNoteOff: (bank: number, noteNumber: number) => void;
  getBankOutputBufferPtr: (bank: number) => number;
  processBlock: () => void;
}

// Strictly typed shape for incoming MessagePort control packets
type SynthMessage =
  | { type: 'INIT_WASM'; bytes: ArrayBuffer }
  | { type: 'NOTE_ON'; bank: number; note: number; frequency: number }
  | { type: 'NOTE_OFF'; bank: number; note: number }
  | { type: 'SET_MATRIX'; src: number; dst: number; gain: number; isAM: boolean }
  | { type: 'SET_ENV'; bank: number; isFreq: boolean; a: number; d: number; s: number; r: number };

export class FMSynthProcessor extends AudioWorkletProcessor {
  private wasm!: FMSynthWasmExports;
  private initialized: boolean = false;
  private outputPtrs: number[] = [];
  private wasmMemoryView!: Float32Array;

  constructor() {
    super();
      this.port.onmessage = (e: MessageEvent<SynthMessage>) => this.handleMessage(e.data);
  }

  private async initWasm(wasmBytes: ArrayBuffer): Promise<void> {
    try {
      // Instantiate raw WebAssembly assembly bytes directly
      const module = await WebAssembly.instantiate(wasmBytes, {});
      this.wasm = module.instance.exports as FMSynthWasmExports;

      // Accessing the ambient audio worklet thread global sampleRate property via globalThis
      // This ensures the TypeScript compiler will not throw an undefined variable warning
      const currentSampleRate = (globalThis as any).sampleRate || 44100;
      this.wasm.initProcessor(currentSampleRate);

      // Fetch constant floating-point memory space mapping addresses for the 4 banks
      this.outputPtrs = [
        this.wasm.getBankOutputBufferPtr(0),
        this.wasm.getBankOutputBufferPtr(1),
        this.wasm.getBankOutputBufferPtr(2),
        this.wasm.getBankOutputBufferPtr(3)
      ];

      // Wrap the WASM memory region as a reusable Float32 array view
      this.wasmMemoryView = new Float32Array(this.wasm.memory.buffer);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize FM Synth WASM Core inside AudioWorklet:', error);
    }
  }

  private async handleMessage(msg: SynthMessage): Promise<void> {
    if (msg.type === 'INIT_WASM') {
      console.log("In handleMessage");
      await this.initWasm(msg.bytes);
      return;
    }

    if (!this.initialized) return;

    // Type-safe control message routing straight to our C engine hooks
    switch (msg.type) {
      case 'NOTE_ON':
        console.log("bank: ", msg.bank, "note: ", msg.note, "frequency", msg.frequency);
        this.wasm.triggerNoteOn(msg.bank, msg.note, msg.frequency);
        break;
      case 'NOTE_OFF':
        this.wasm.triggerNoteOff(msg.bank, msg.note);
        break;
      case 'SET_MATRIX':
        this.wasm.setMatrixGain(msg.src, msg.dst, msg.gain, msg.isAM);
        break;
      case 'SET_ENV':
        this.wasm.setBankEnvelopeParams(msg.bank, msg.isFreq, msg.a, msg.d, msg.s, msg.r);
        break;
    }
  }

  // Main 128-sample block audio thread rendering loop
  public override process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    if (!this.initialized) return true;
    // Execute the 128-sample C inner loop processing state machine
    this.wasm.processBlock();

    // Route internal bank outputs to separate physical Web Audio node output indexes
    for (let b = 0; b < 4; b++) {
      const outputChannelBlock = outputs[b];
      if (!outputChannelBlock || outputChannelBlock.length === 0) continue;

      // Extract the Float32 sample window directly from WASM heap bounds
      const startIdx = this.outputPtrs[b] / 4; // 4 bytes per 32-bit float element
      const endIdx = startIdx + 128;
      const bankSamples = this.wasmMemoryView.subarray(startIdx, endIdx);

      // Copy the mono channel signal to all available output subchannels (e.g. Left/Right stereo configurations)
      for (let channel = 0; channel < outputChannelBlock.length; channel++) {
        outputChannelBlock[channel].set(bankSamples);
      }
    }

    return true; // Keep the audio processor alive
  }
}
//console.log("registerProcessor")
registerProcessor('fm-synth-processor', FMSynthProcessor);
