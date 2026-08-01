import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FmSynthService {
  private audioContext!: AudioContext;
  private synthNode!: AudioWorkletNode;

  async initializeSynth(): Promise<void> {
    // 1. Instantiate the AudioContext on the main thread
    this.audioContext = new AudioContext();

    // 2. Load the compiled JavaScript asset file into the audio worklet thread space
    await this.audioContext.audioWorklet.addModule('assets/wasm/fm-synth-processor.js');

    // 3. Create the multi-output AudioWorkletNode node wrapper
    this.synthNode = new AudioWorkletNode(this.audioContext, 'fm-synth-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 4, // 4 individual audio outputs (one for each engine bank)
      // @ts-ignore
      outputChannelCounts: [2, 2, 2, 2] // Configured as stereo pairs
    });

    // 4. Fetch your raw WASM binary from the assets folder and stream it across the port
    const response = await fetch('assets/wasm/processor.wasm');
    const wasmBytes = await response.arrayBuffer();
    this.synthNode.port.postMessage({ type: 'INIT_WASM', bytes: wasmBytes });

    // 5. Connect Bank 0 (Output 0) directly to speakers as a baseline test
    this.synthNode.connect(this.audioContext.destination, 0, 0);
  }

  // Method to invoke clean triggers down into your background WebAssembly context
  triggerNoteOn(bank: number, note: number, frequency: number): void {
    this.synthNode.port.postMessage({ type: 'NOTE_ON', bank, note, frequency });
  }

  triggerNoteOff(bank: number, note: number): void {
    this.synthNode.port.postMessage({ type: 'NOTE_OFF', bank, note });
  }
}
