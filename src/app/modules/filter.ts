import {OscFilterBase} from './osc-filter-base';
import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';

export class Filter extends OscFilterBase {
  filter: BiquadFilterNode;

  constructor(protected override audioCtx: AudioContext) {
    super(audioCtx);
    this.filter = audioCtx.createBiquadFilter();
    this.filter.type = "bandpass";
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.filter.gain.setValueAtTime(this.filter.gain.maxValue, audioCtx.currentTime);
    this.filter.connect(this.gain);
  }

  setFrequency(freq: number) {
    const f = super.clampFrequency(freq);
    this.filter.frequency.setValueAtTime(f, this.audioCtx.currentTime);
    this.frequencyMod.gain.setValueAtTime(f * this.modLevel, this.audioCtx.currentTime);
    this.freq = f;
  }

  setQ(q: number) {
    this.filter.Q.setValueAtTime(q, this.audioCtx.currentTime);
  }

  setType(type: BiquadFilterType) {
    this.filter.type = type;
  }

  modulation(modulator: AudioNode) {
    this.modulator = modulator;
    modulator.connect(this.frequencyMod);
    this.frequencyMod.connect(this.filter.frequency);
    this.frequencyMod.gain.setValueAtTime(this.filter.frequency.value * this.modLevel, this.audioCtx.currentTime);
 //   this.useFreqBendEnvelope = false;
  }

  setModLevel(level: number) {
    this.modLevel = level * OscFilterBase.maxLevel / 100;
    this.frequencyMod.gain.setValueAtTime(this.filter.frequency.value * this.modLevel, this.audioCtx.currentTime);
   /// this.useFreqBendEnvelope = false;
  }

  override setFreqBendEnvelope(envelope: FreqBendValues) {
    super.setFreqBendEnvelope(envelope);
    //this.initialFrequencyFactor = envelope.releaseLevel;  // Ensure frequency starts at the level it ends at in the frequency bend envelope.
    this.filter.frequency.setValueAtTime(super.clampFrequency(this.freq * envelope.releaseLevel), this.audioCtx.currentTime);
  }

  override useFreqBendEnvelope(useFreqBendEnvelope:boolean) {
    super.useFreqBendEnvelope(useFreqBendEnvelope);
    this.filter.frequency.setValueAtTime(super.clampFrequency(this.freq), this.audioCtx.currentTime);
  }

  // Key down for this oscillator
  override keyDown() {
    super.attack();
    const ctx = this.audioCtx;
    if (this._useFreqBendEnvelope) {
      const freq = this.freq;
      this.filter.frequency.cancelAndHoldAtTime(ctx.currentTime);
      //this.filter.frequency.setValueAtTime(freq*this.freqBendEnv.releaseLevel, this.audioCtx.currentTime);
      this.filter.frequency.exponentialRampToValueAtTime(this.clampFrequency(freq * this.freqBendEnv.attackLevel), ctx.currentTime + this.freqBendEnv.attackTime);
      this.filter.frequency.exponentialRampToValueAtTime(this.clampFrequency(freq * this.freqBendEnv.sustainLevel), ctx.currentTime + this.freqBendEnv.attackTime + this.freqBendEnv.decayTime);
    }
  }

  // Key released for this oscillator
  keyUp() {
    super.release();
    const ctx = this.audioCtx;
    if (this._useFreqBendEnvelope) {
      this.filter.frequency.cancelAndHoldAtTime(ctx.currentTime);
      this.filter.frequency.exponentialRampToValueAtTime(this.clampFrequency(this.freq*this.freqBendEnv.releaseLevel), ctx.currentTime + this.freqBendEnv.releaseTime);
    }
  }
}
