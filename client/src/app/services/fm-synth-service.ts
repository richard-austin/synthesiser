import {Injectable} from '@angular/core';
import {OscillatorArray} from '../modules/modulation/oscillator-array';

@Injectable({
  providedIn: 'root'
})
export class FmSynthService {
  private audioContext!: AudioContext;
  private synthNode!: OscillatorArray;
  private gainNodes: GainNode[] = [];

  async initializeSynth(audioCtx: AudioContext, numberOfBanks: number = 4, oscillatorsPerBank:number = 12): Promise<void> {
    if(!this.audioContext) {
      // 1. Instantiate the AudioContext on the main thread
      this.audioContext = audioCtx;
      this.gainNodes = Array.from({length: numberOfBanks}, () =>  audioCtx.createGain());
      this.gainNodes.forEach(gainNode => {gainNode.gain.value = 1});
      // 2. Load the compiled JavaScript asset file into the audio worklet thread space
      // 3. Create the multi-output AudioWorkletNode node wrapper
      this.synthNode = new OscillatorArray(this.audioContext, numberOfBanks, oscillatorsPerBank);
      await this.synthNode.start();

      this.gainNodes.forEach((gainNode, i) => {
        this.synthNode.node.connect(gainNode, i, 0);
      });
      this.synthNode.port.onmessage = (event: MessageEvent) => {
        // console.log(String(event.data.type));
      }
    }
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  setGain(gain: number, bank: number) {
    this.gainNodes[bank].gain.value = gain;
  }

  connect(dest: AudioNode, output: number, input?:number): AudioNode {
    return this.gainNodes[output].connect(dest);
  }

  disconnect(output:number) {
    this.gainNodes[output].disconnect();
  }
  // Method to invoke clean triggers down into your background WebAssembly context
  keyDown(bank: number, key: number): void {
    this.synthNode.keyDown(bank, key);
  }

  keyUp(bank: number, key: number): void {
    this.synthNode.keyUp(bank, key);
  }

  tuning(tuning: number, bank: number): void {
    this.synthNode.tuning(tuning, bank);
  }

  detune(detune: number, bank: number): void {
    this.synthNode.detune(detune, bank);
  }
}
