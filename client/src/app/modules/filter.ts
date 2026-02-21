import {OscFilterBase} from './osc-filter-base';
import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {filterModType, oscModType} from '../enums/enums';
import {Subscription, timer} from 'rxjs';

export class Filter extends OscFilterBase {
  filter: BiquadFilterNode;
  filter2: BiquadFilterNode;
  readonly freqBendBase = 16;
  keyIndex: number = -1;

  constructor(protected override audioCtx: AudioContext) {
    super(audioCtx);
    this.filter = audioCtx.createBiquadFilter();
    this.filter.type = "bandpass";
    this.filter2 = audioCtx.createBiquadFilter();
    this.filter2.type = "bandpass";
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.useAmplitudeEnvelope = false;

    this.filter.gain.value = this.filter2.gain.value = 0;
    this.gain.gain.value = 1;
    this.filter.connect(this.filter2);
    this.filter2.connect(this.gain);
    this.frequencyMod.connect(this.filter.detune);
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
    this.filter.type = type;
    this.filter2.type = type;
  }

  modulation(modulator: AudioNode, type: filterModType | oscModType = filterModType.frequency) {
    if(type === 'frequency') {
      modulator.connect(this.frequencyMod);
      this.frequencyMod.connect(this.filter.detune);
      this.frequencyMod.gain.value = this.modLevel * 2;
    }
    else if(type === 'off') {
      this.modulationOff();
    }
  }

  setModLevel(level: number) {
    this.modLevel = level;
    this.frequencyMod.gain.value = this.modLevel * 2;
  }

  override modulationOff() {
    super.modulationOff();
    // this.filter.frequency.value = this.freq; ???????????????????????????????????????
    // this.filter2.frequency.value = this.freq;
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
    this.filter2.frequency.setValueAtTime(super.clampFrequency(this.freq * envelope.releaseLevel), this.audioCtx.currentTime);
  }

  override useFreqBendEnvelope(useFreqBendEnvelope:boolean) {
    super.useFreqBendEnvelope(useFreqBendEnvelope);
    this.filter.frequency.setValueAtTime(super.clampFrequency(this.freq), this.audioCtx.currentTime);
    this.filter2.frequency.setValueAtTime(super.clampFrequency(this.freq), this.audioCtx.currentTime);
  }

  freqBendEnvTimerSub!: Subscription;
  // Key down for this filter
  override keyDown(velocity: number) {
    super.attack(velocity, this.filter2.frequency.value);

    if (this._useFreqBendEnvelope) {
      const ctx = this.audioCtx;
      const freq = this.freq;
      this.filter.frequency.cancelAndHoldAtTime(ctx.currentTime);
      this.filter2.frequency.cancelAndHoldAtTime(ctx.currentTime);
      this.filter.frequency.setValueAtTime(freq*Math.pow(this.freqBendBase,this.freqBendEnv.releaseLevel), this.audioCtx.currentTime);
      this.filter2.frequency.setValueAtTime(freq*Math.pow(this.freqBendBase,this.freqBendEnv.releaseLevel), this.audioCtx.currentTime);
      this.filter.frequency.exponentialRampToValueAtTime(this.clampFrequency(freq * Math.pow(this.freqBendBase,this.freqBendEnv.attackLevel)), ctx.currentTime + this.freqBendEnv.attackTime);
      this.filter2.frequency.exponentialRampToValueAtTime(this.clampFrequency(freq * Math.pow(this.freqBendBase,this.freqBendEnv.attackLevel)), ctx.currentTime + this.freqBendEnv.attackTime);
      this.freqBendEnvTimerSub = timer(this.freqBendEnv.attackTime).subscribe(() => {
        this.filter.frequency.exponentialRampToValueAtTime(this.clampFrequency(freq * Math.pow(this.freqBendBase, this.freqBendEnv.sustainLevel)), ctx.currentTime + this.freqBendEnv.decayTime);
        this.filter2.frequency.exponentialRampToValueAtTime(this.clampFrequency(freq * Math.pow(this.freqBendBase, this.freqBendEnv.sustainLevel)), ctx.currentTime + this.freqBendEnv.decayTime);
      });
    }
  }

  // Key released for this filter
  keyUp() {
    super.release(this.filter2.frequency.value);

    if (this._useFreqBendEnvelope) {
      const ctx = this.audioCtx;
      this.freqBendEnvTimerSub?.unsubscribe();
      this.filter.frequency.cancelAndHoldAtTime(ctx.currentTime);
      this.filter2.frequency.cancelAndHoldAtTime(ctx.currentTime);
      this.filter.frequency.setValueAtTime(this.filter.frequency.value, this.audioCtx.currentTime);// Prevent step changes in freq
      this.filter2.frequency.setValueAtTime(this.filter2.frequency.value, this.audioCtx.currentTime); // Prevent step changes in freq
      this.filter.frequency.exponentialRampToValueAtTime(this.clampFrequency(this.freq*Math.pow(this.freqBendBase, this.freqBendEnv.releaseLevel)), ctx.currentTime + this.freqBendEnv.releaseTime);
      this.filter2.frequency.exponentialRampToValueAtTime(this.clampFrequency(this.freq*Math.pow(this.freqBendBase, this.freqBendEnv.releaseLevel)), ctx.currentTime + this.freqBendEnv.releaseTime);
    }
  }
}
