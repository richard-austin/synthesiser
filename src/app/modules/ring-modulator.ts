import {Oscillator} from './oscillator';

export class RingModulator {
  _ringMod: GainNode;
  modulator: Oscillator

  constructor(private audioCtx: AudioContext) {
    this._ringMod = audioCtx.createGain();
    this.modulator = new Oscillator(audioCtx);
  }
  input1(): AudioNode {
    return this._ringMod;
  }

  input2(): AudioParam {
    return this._ringMod.gain;
  }

  setModGain(gain: number) {
    this.modulator.setGain(gain);
  }

  internalMod(enable: boolean) {
    if(enable) {
      this.modulator.connect(this.input2());
    }
  }
}
