import {OscFilterBase} from './osc-filter-base';
import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {filterModType, oscModType} from '../enums/enums';

export class Filter extends OscFilterBase {
  filter: BiquadFilterNode;
  readonly freqBendBase = 16;

  constructor(protected override audioCtx: AudioContext) {
    super(audioCtx);
    this.filter = audioCtx.createBiquadFilter();
    this.filter.type = "bandpass";
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.useAmplitudeEnvelope = false;
    this.filter.gain.setValueAtTime(this.filter.gain.maxValue, audioCtx.currentTime);
    this.filter.connect(this.gain);
  }

  setFrequency(freq: number) {
    const f = super.clampFrequency(freq);
    this.filter.frequency.setValueAtTime(f, this.audioCtx.currentTime);
    this.frequencyMod.gain.setValueAtTime(f * this.modLevel, this.audioCtx.currentTime);
    this.freq = f;
  }

  setDetune(deTune: number) {
    this.filter.detune.value = deTune;
  }

  setQ(q: number) {
    this.filter.Q.value = q;
  }

  setType(type: BiquadFilterType) {
    this.filter.type = type;
  }

  modulation(modulator: AudioNode, type: filterModType | oscModType = filterModType.frequency) {
    this.modulator = modulator;
    if(type === 'frequency') {
      modulator.connect(this.frequencyMod);
      this.frequencyMod.connect(this.filter.frequency);
      this.frequencyMod.gain.setValueAtTime(this.freq * this.modLevel, this.audioCtx.currentTime);
    }
    else if(type === 'off') {
      this.modulationOff();
    }
  }

  setModLevel(level: number) {
    this.modLevel = level * OscFilterBase.maxLevel;
    this.frequencyMod.gain.setValueAtTime(this.freq * this.modLevel, this.audioCtx.currentTime);
  }

  override modulationOff() {
    super.modulationOff();
    this.filter.frequency.setValueAtTime(this.freq, this.audioCtx.currentTime);
  }

  override connect(param: AudioParam) : void;
  override connect(node: AudioNode) : AudioNode;

  override connect(arg: AudioNode | AudioParam): AudioNode | void{
    if(arg instanceof AudioNode)
      return this.amplitudeMod.connect(arg);
    else if(arg instanceof AudioParam)
      this.amplitudeMod.connect(arg);
  }

  override disconnect() {
    this.amplitudeMod.disconnect();
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

  // Key down for this filter
  override keyDown(velocity: number) {
    super.attack(velocity);
    const ctx = this.audioCtx;
    if (this._useFreqBendEnvelope) {
      const freq = this.freq;
      this.filter.frequency.cancelAndHoldAtTime(ctx.currentTime);
      this.filter.frequency.setValueAtTime(freq*Math.pow(this.freqBendBase,this.freqBendEnv.releaseLevel), this.audioCtx.currentTime);
      this.filter.frequency.linearRampToValueAtTime(this.clampFrequency(freq * Math.pow(this.freqBendBase,this.freqBendEnv.attackLevel)), ctx.currentTime + this.freqBendEnv.attackTime);
      this.filter.frequency.linearRampToValueAtTime(this.clampFrequency(freq * Math.pow(this.freqBendBase, this.freqBendEnv.sustainLevel)), ctx.currentTime + this.freqBendEnv.attackTime + this.freqBendEnv.decayTime);
    }
  }

  // Key released for this filter
  keyUp() {
    super.release();
    const ctx = this.audioCtx;
    if (this._useFreqBendEnvelope) {
      this.filter.frequency.cancelAndHoldAtTime(ctx.currentTime);
      this.filter.frequency.linearRampToValueAtTime(this.clampFrequency(this.freq*Math.pow(this.freqBendBase, this.freqBendEnv.releaseLevel)), ctx.currentTime + this.freqBendEnv.releaseTime);
    }
  }
}
