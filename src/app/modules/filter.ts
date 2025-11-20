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
    this.filter.connect(this.gain);
  }

  setFrequency(freq: number) {
    let f = super.clampFrequency(freq);
    let fStart = super.clampFrequency(freq * this.initialFrequencyFactor);
    this.filter.frequency.setValueAtTime(fStart, this.audioCtx.currentTime);
    this.mod.gain.setValueAtTime(fStart * this.modLevel, this.audioCtx.currentTime);
    this.freq = f;
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
    this.modLevel = level * OscFilterBase.maxLevel / 100;
    this.mod.gain.setValueAtTime(this.filter.frequency.value * this.modLevel, this.audioCtx.currentTime);
  }

  override setFreqBendEnvelope(envelope: FreqBendValues) {
    super.setFreqBendEnvelope(envelope);
    this.initialFrequencyFactor = envelope.releaseLevel;  // Ensure frequency starts at the level it ends at in the frequency bend envelope.
    this.filter.frequency.setValueAtTime(super.clampFrequency(this.freq * this.initialFrequencyFactor), this.audioCtx.currentTime);
  }

  override freqBendEnvelopeOff() {
    super.freqBendEnvelopeOff();
    this.initialFrequencyFactor = 1;
    this.filter.frequency.setValueAtTime(this.freq, this.audioCtx.currentTime);
  }

  // Key down for this oscillator
  override keyDown() {
    super.attack();
    const ctx = this.audioCtx;
    if (this.useFreqBendEnvelope) {
      const freq = this.freq;
      this.filter.frequency.cancelAndHoldAtTime(ctx.currentTime);
      this.filter.frequency.linearRampToValueAtTime(this.clampFrequency(freq * this.freqBendEnv.attackLevel), ctx.currentTime + this.freqBendEnv.attackTime);
      this.filter.frequency.linearRampToValueAtTime(this.clampFrequency(freq * this.freqBendEnv.sustainLevel), ctx.currentTime + this.freqBendEnv.attackTime + this.freqBendEnv.decayTime);
    }
  }

  // Key released for this oscillator
  keyUp() {
    super.release();
    const ctx = this.audioCtx;
    if (this.useFreqBendEnvelope) {
      this.filter.frequency.cancelAndHoldAtTime(ctx.currentTime);
      this.filter.frequency.linearRampToValueAtTime(this.clampFrequency(this.freq*this.freqBendEnv.releaseLevel), ctx.currentTime + this.freqBendEnv.releaseTime);
    }
  }
}
