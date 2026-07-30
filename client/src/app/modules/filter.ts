import {OscFilterBase} from './osc-filter-base';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {oscModType} from '../enums/enums';
import {PitchEnvelope} from './pitch-envelope';

export class Filter extends OscFilterBase {
  filter: BiquadFilterNode;
  filter2: BiquadFilterNode;
  readonly freqBendBase = 16;
  keyIndex: number = -1;
  gainFactor: number = 1;
  gainValue: number = 0.5;
  pitchEnvelope: PitchEnvelope;
  pitchEnvelope2: PitchEnvelope;

  constructor(protected override audioCtx: AudioContext) {
    super(audioCtx);
    this.filter = audioCtx.createBiquadFilter();
    this.filter.type = "bandpass";
    this.filter2 = audioCtx.createBiquadFilter();
    this.filter2.type = "bandpass";

    this.filter.frequency.value = this.filter2.frequency.value = 5000; // Initial setting

    this.filter.gain.value = this.filter2.gain.value = 0;
    this.filter.connect(this.filter2);
    this.filter2.connect(this.amplitudeMod);
    this.frequencyModInternal.connect(this.filter.frequency);
    this.pitchEnvelope = new PitchEnvelope(this.filter, this.freqBendBase);
    this.pitchEnvelope2 = new PitchEnvelope(this.filter2, this.freqBendBase);
  }

  override setGain(gain: number) {
    super.setGain(gain);
    this.gainValue = gain;
  }

  setFrequency(freq: number) {
    const f = super.clampFrequency(freq);
    this.filter.frequency.value = f;
    this.filter2.frequency.value = f;
    this.freq = f;
  }

  setDetune(deTune: number) {
    this.filter.detune.value = deTune;
    this.filter2.detune.value = deTune;
  }

  setQ(q: number) {
    const sqrtQ = q /5;
    this.filter.Q.value =  sqrtQ;
    this.filter2.Q.value = sqrtQ;
  }

  setType(type: BiquadFilterType) {
    this.filter.type = this.filter2.type = type;
    this.gainFactor = type === "bandpass" ? 50 : 1;
    this.setGain(this.gainValue);
  }

  override setModulation() {
    this.setModLevel(this.modLevel);
  }

  setModLevel(level: number) {
    this.modLevel = level;
    if (this.modType === oscModType.frequency) {
      this.frequencyModInternal.gain.value = this.gainFactor * (Math.pow(this.freqModGainBase, this.modLevel) - 1);
    } else if (this.modType === oscModType.amplitude) {
      this.amplitudeModDepth.gain.value = this.modLevel / 200;
    }
  }

   setFreqBendEnvelope(envelope: FreqBendValues) {
    this.pitchEnvelope.setFreqBendEnvelope(envelope);
    this.pitchEnvelope2.setFreqBendEnvelope(envelope);
    this._useFreqBendEnvelope = true;
   }

  override useFreqBendEnvelope(useFreqBendEnvelope:boolean) {
    super.useFreqBendEnvelope(useFreqBendEnvelope);
    this.filter.frequency.setValueAtTime(super.clampFrequency(this.freq), this.audioCtx.currentTime);
    this.filter2.frequency.setValueAtTime(super.clampFrequency(this.freq), this.audioCtx.currentTime);
  }

  // Key down for this filter
  override keyDown(velocity: number) {
    if (this._useFreqBendEnvelope) {
      this.pitchEnvelope.keyDown(this.freq);
      this.pitchEnvelope2.keyDown(this.freq);
    }
  }

  // Key released for this filter
  keyUp() {
    if (this._useFreqBendEnvelope) {
      this.pitchEnvelope.keyUp();
      this.pitchEnvelope2.keyUp();
    }
  }

  destroy() {
    this.filter.disconnect();
    this.filter2.disconnect();
    this.disconnect();
  }
}
