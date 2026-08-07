import {Injectable} from '@angular/core';
import {envelopePhase, OscillatorArray} from '../modules/modulation/oscillator-array';
import {WaveTables} from '../modules/wavetables';

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
      }
    }
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  public setGain(gain: number, bank: number) {
    this.gainNodes[bank].gain.value = gain;
  }

  public connect(dest: AudioNode, output: number, input?:number): AudioNode {
    return this.gainNodes[output].connect(dest);
  }

  public disconnect(output:number) {
    this.gainNodes[output].disconnect();
  }
  // Method to invoke clean triggers down into your background WebAssembly context
  public keyDown(bank: number, key: number, velocity: number): void {
    this.synthNode.keyDown(bank, key, velocity);
  }

  public keyUp(bank: number, key: number): void {
    this.synthNode.keyUp(bank, key);
  }

  public envelope(bank: number, phase: envelopePhase, value: number) {
    this.synthNode.envelope(bank, phase, value);
  }

  public tuning(tuning: number, bank: number): void {
    this.synthNode.tuning(tuning, bank);
  }

  public detune(detune: number, bank: number): void {
    this.synthNode.detune(detune, bank);
  }

  setType(type: OscillatorType, bank: number) {

    if (/^(sine)$/.test(type)) {
      this.synthNode.type = type;
    } else {
      const wtDetails = WaveTables.wavetables.find(el => el.value === type);
      if (wtDetails) {
        this.synthNode.setPeriodicWave(OscillatorArray.createPeriodicWave(this.audioContext, wtDetails?.waveTable.real, wtDetails?.waveTable.imag), bank);
        this.synthNode.type = type;
      }
      else {
        console.error("Cannot find wave table for" + type)
        this.synthNode.type = "sine";
      }
    }
  }
}
