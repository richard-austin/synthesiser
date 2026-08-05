import {Injectable} from '@angular/core';
import {OscillatorWithPhaseMod} from '../modules/modulation/oscillator-with-phase-mod';

@Injectable({
  providedIn: 'root'
})
export class FmSynthService {
  private audioContext!: AudioContext;
  private synthNode!: OscillatorWithPhaseMod;

  async initializeSynth(): Promise<void> {
    // 1. Instantiate the AudioContext on the main thread
    this.audioContext = new AudioContext();

    // 2. Load the compiled JavaScript asset file into the audio worklet thread space
    // 3. Create the multi-output AudioWorkletNode node wrapper
    this.synthNode = new OscillatorWithPhaseMod(this.audioContext, 4, 12);
    await this.synthNode.start();

    // 4. Fetch your raw WASM binary from the assets folder and stream it across the port
    // const response = await fetch('assets/wasm/processor.wasm');
    // const wasmBytes = await response.arrayBuffer();
    // console.log("Calling INIT_WASM");
    //this.synthNode.port.postMessage({ type: 'INIT_WASM', bytes: wasmBytes });

    // 5. Connect Bank 0 (Output 0) directly to speakers as a baseline test
    this.synthNode.node.connect(this.audioContext.destination, 0, 0);
    this.synthNode.node.connect(this.audioContext.destination, 1, 0);
    this.synthNode.node.connect(this.audioContext.destination, 2, 0);
    this.synthNode.node.connect(this.audioContext.destination, 3, 0);

    this.synthNode.port.onmessage = (event: MessageEvent) => {
     // console.log(String(event.data.type));
    }
  }

  // Method to invoke clean triggers down into your background WebAssembly context
  keyDown(bank: number, key: number): void {
    this.synthNode.keyDown(bank, key);
  }

  keyUp(bank: number, key: number): void {
    this.synthNode.keyUp(bank, key);
  }
}
