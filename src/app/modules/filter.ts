import {OscFilterBase} from './osc-filter-base';
import {ADSRValues} from '../util-classes/adsrvalues';

export class Filter extends OscFilterBase {
  filter: BiquadFilterNode;
  // public static override readonly  maxLevel: number = 1;
  // public static override readonly maxFrequency = 20000;


  constructor(protected override audioCtx: AudioContext) {
    super(audioCtx);
    this.filter = audioCtx.createBiquadFilter();
    this.filter.type = "bandpass";
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.filter.connect(this.gain);
  }

  setFrequency(freq: number) {
    const f = freq <= OscFilterBase.maxFrequency ?
      freq >= 0 ? freq :
        freq : OscFilterBase.maxFrequency;
    this.filter.frequency.setValueAtTime(f, this.audioCtx.currentTime);
    this.mod.gain.setValueAtTime(f * this.modLevel, this.audioCtx.currentTime);
    this.freq = freq;
  }

  setQ(q: number) {
    this.filter.Q.setValueAtTime(q, this.audioCtx.currentTime);
  }

  setType(type: BiquadFilterType) {
    this.filter.type = type;
  }

  modulation(modulator: OscillatorNode) {
    this.modulator = modulator;
    modulator.connect(this.mod);
    this.mod.connect(this.filter.frequency);
    this.mod.gain.setValueAtTime(this.filter.frequency.value * this.modLevel, this.audioCtx.currentTime);

  }

  setModLevel(level: number) {
    this.modLevel = level *OscFilterBase.maxLevel /100;
    this.mod.gain.setValueAtTime(this.filter.frequency.value * this.modLevel, this.audioCtx.currentTime);
  }

  // Key down for this oscillator
  override keyDown() {
    super.keyDown();
    if (this.useFreqBendEnvelope) {
      const freq = this.freq;
      this.filter.frequency.cancelAndHoldAtTime(this.audioCtx.currentTime);
      this.filter.frequency.linearRampToValueAtTime(freq + freq * this.freqBendEnv.attackLevel, this.audioCtx.currentTime+this.freqBendEnv.attackTime);
      this.filter.frequency.linearRampToValueAtTime(freq + freq * this.freqBendEnv.sustainLevel, this.audioCtx.currentTime + this.freqBendEnv.attackTime + this.freqBendEnv.decayTime);
    }
  }

  // Key released for this oscillator
  keyUp() {
    this.gain.gain.cancelAndHoldAtTime(this.audioCtx.currentTime);
    //   this.gain.gain.setValueAtTime(this.gain.gain.value, this.audioCtx.currentTime);
    this.gain.gain.linearRampToValueAtTime(0.0, this.audioCtx.currentTime + this.env.releaseTime);

    if(this.useFreqBendEnvelope) {
      this.filter.frequency.cancelAndHoldAtTime(this.audioCtx.currentTime);
      this.filter.frequency.linearRampToValueAtTime(this.freq, this.audioCtx.currentTime + this.freqBendEnv.releaseTime);
    }
  }

}
