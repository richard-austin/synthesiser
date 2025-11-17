import {ADSRValues} from '../util-classes/adsrvalues';
import {OscFilterBase} from './osc-filter-base';

export class Oscillator extends OscFilterBase{
  oscillator: OscillatorNode;
  // public static override readonly  maxLevel: number = 1;
  // public static override readonly maxFrequency = 20000;


  constructor(protected override audioCtx: AudioContext) {
    super(audioCtx);
    this.oscillator = audioCtx.createOscillator();
    this.oscillator.type = "sine";
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.oscillator.connect(this.gain);
    this.oscillator.start();

  }

  setFrequency(freq: number) {
    const f = freq <= OscFilterBase.maxFrequency ?
      freq >= 0 ? freq :
        freq : OscFilterBase.maxFrequency;
    this.oscillator.frequency.setValueAtTime(f, this.audioCtx.currentTime);
    this.mod.gain.setValueAtTime(f * this.modLevel, this.audioCtx.currentTime);
    this.freq = freq;
  }

  setType(type: OscillatorType) {
    this.oscillator.type = type;
  }

  modulation(modulator: OscillatorNode) {
    this.modulator = modulator;
    modulator.connect(this.mod);
    this.mod.connect(this.oscillator.frequency);
    this.mod.gain.setValueAtTime(this.oscillator.frequency.value * this.modLevel, this.audioCtx.currentTime);

  }

  setModLevel(level: number) {
    this.modLevel = level *OscFilterBase.maxLevel /100;
    this.mod.gain.setValueAtTime(this.oscillator.frequency.value * this.modLevel, this.audioCtx.currentTime);
  }

  // Key down for this oscillator
  override keyDown() {
    super.keyDown();
    if (this.useFreqBendEnvelope) {
      const freq = this.freq;
      this.oscillator.frequency.cancelAndHoldAtTime(this.audioCtx.currentTime);
      this.oscillator.frequency.linearRampToValueAtTime(freq + freq * this.freqBendEnv.attackLevel, this.audioCtx.currentTime+this.freqBendEnv.attackTime);
      this.oscillator.frequency.linearRampToValueAtTime(freq + freq * this.freqBendEnv.sustainLevel, this.audioCtx.currentTime + this.freqBendEnv.attackTime + this.freqBendEnv.decayTime);
    }
  }

  // Key released for this oscillator
  keyUp() {
    this.gain.gain.cancelAndHoldAtTime(this.audioCtx.currentTime);
 //   this.gain.gain.setValueAtTime(this.gain.gain.value, this.audioCtx.currentTime);
    this.gain.gain.linearRampToValueAtTime(0.0, this.audioCtx.currentTime + this.env.releaseTime);

    if(this.useFreqBendEnvelope) {
      this.oscillator.frequency.cancelAndHoldAtTime(this.audioCtx.currentTime);
      this.oscillator.frequency.linearRampToValueAtTime(this.freq, this.audioCtx.currentTime + this.freqBendEnv.releaseTime);
    }
  }
}
