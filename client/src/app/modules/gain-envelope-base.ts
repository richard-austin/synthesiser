import {ADSRValues} from '../util-classes/adsrvalues';
import {OscFilterBase} from './osc-filter-base';
import {filterModType, oscModType} from '../enums/enums';
import {Subscription, timer} from 'rxjs';

export abstract class GainEnvelopeBase {
  public readonly gain: GainNode;
  protected readonly modOutput: GainNode;
  frequencyMod: GainNode;
  frequencyMod2: GainNode;
  amplitudeMod: GainNode;
  amplitudeModDepth: GainNode;
  amplitudeMod2Depth: GainNode;
  protected modType: oscModType | filterModType;
  protected modType2: oscModType | filterModType;
  protected modLevel: number = 0;
  protected mod2Level: number = 0;
  private _useAmplitudeEnvelope = false;
  env: ADSRValues;
  modulator!: AudioNode;

  protected setLevel: number;
  public static readonly maxLevel: number = 1;
  public static readonly minLevel: number = 0.000001;

  protected constructor(protected audioCtx: AudioContext) {
    this.gain = audioCtx.createGain();
    this.setLevel = 0;
    this.gain.gain.value = this.setLevel;

    this.modOutput = new GainNode(this.audioCtx);
    this.modOutput.gain.value = 1;  // Fixed gain on this as the modulated oscillator sets the gain
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.frequencyMod = audioCtx.createGain();
    this.frequencyMod2 = this.audioCtx.createGain();
    this.frequencyMod.gain.value = 0;
    this.frequencyMod2.gain.value = 0;
    this.amplitudeMod = audioCtx.createGain();
    this.amplitudeMod.gain.value = 1;
    this.amplitudeModDepth = audioCtx.createGain();
    this.amplitudeMod2Depth = audioCtx.createGain();
    this.amplitudeModDepth.gain.value = 0;
    this.amplitudeMod2Depth.gain.value = 0;
    this.gain.connect(this.amplitudeMod);
    this.amplitudeModDepth.connect(this.amplitudeMod.gain);
    this.amplitudeMod2Depth.connect(this.amplitudeMod.gain);
    this.modType = oscModType.amplitude;
    this.modType2 = oscModType.amplitude;
  }

  setGain(gain: number) {
    this.setLevel = this.clampLevel(GainEnvelopeBase.exponentiateGain(gain));
    let gainToUse = gain;
    if (this._useAmplitudeEnvelope)
      gainToUse = this.clampLevel(gain * OscFilterBase.minLevel);
    this.gain.gain.value = this.clampLevel(GainEnvelopeBase.exponentiateGain(gainToUse));
  }

  public static exponentiateGain(gain: number) {
    return (Math.pow(10, gain) - 1) / (Math.pow(10, 1) - 1);
  }

  setAmplitudeEnvelope(env: ADSRValues) {
    this.env = env;
    this.gain.gain.setValueAtTime(this.clampLevel(this.setLevel * OscFilterBase.minLevel), this.audioCtx.currentTime);
  }

  modulationOff() {
    this.frequencyMod.gain.value = 0;
    this.amplitudeModDepth.gain.value = 0;
  }

  modulation2Off() {
    this.frequencyMod2.gain.value = 0;
    this.amplitudeMod2Depth.gain.value = 0;
  }

  abstract modulation(modulator: AudioNode, type: oscModType | filterModType): void;

  public set useAmplitudeEnvelope(useAmplitudeEnvelope: boolean) {
    this._useAmplitudeEnvelope = useAmplitudeEnvelope;
    let gainToUse = this.clampLevel(this.setLevel * OscFilterBase.minLevel);
    this.gain.gain.cancelAndHoldAtTime(this.audioCtx.currentTime);
    this.gain.gain.setValueAtTime(this.clampLevel(gainToUse), this.audioCtx.currentTime);
  }

  public get useAmplitudeEnvelope() {
    return this._useAmplitudeEnvelope;
  }

  clampLevel(level: number) {
    return level < GainEnvelopeBase.minLevel ? GainEnvelopeBase.minLevel :
      level > GainEnvelopeBase.maxLevel ? GainEnvelopeBase.maxLevel :
        level;
  }

  private _minRampTime: number = 0.03125;
  sub!: Subscription;
  velocity!: number;

  attack(velocity: number, frequency: number = 2000) {
    if (this.releaseFinishedSub)
      this.releaseFinishedSub.unsubscribe();

    this.minRampTime(frequency);
    const ctx = this.audioCtx;
    if (this.useAmplitudeEnvelope) {
      this.velocity = Math.pow(velocity / 127, .75);
      const setLevel = this.setLevel;
      this.gain.gain.cancelAndHoldAtTime(ctx.currentTime);
      this.gain.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.maxLevel * setLevel * this.velocity), ctx.currentTime + this.env.attackTime + this._minRampTime); // Ramp to attack level
      this.sub = timer((this.env.attackTime + this._minRampTime) * 1000).subscribe(() => {
        this.gain.gain.exponentialRampToValueAtTime(this.clampLevel(this.env.sustainLevel * setLevel * this.velocity), ctx.currentTime + this.env.decayTime + this._minRampTime);  // Ramp to sustain level
      });
    } else { // Legato mode
      this.sub?.unsubscribe();
      const setLevel = this.setLevel;
      this.gain.gain.cancelAndHoldAtTime(ctx.currentTime);
      this.gain.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.maxLevel * setLevel), ctx.currentTime + this.env.attackTime + this._minRampTime); // Ramp to attack level
    }
  }

  private releaseFinishedSub: Subscription | null = null;
  public releaseFinished: (() => void) | null = null;

  release(frequency: number = 2000) {
    this.minRampTime(frequency);
    if (this.useAmplitudeEnvelope) {
      this.sub?.unsubscribe();
      this.gain.gain.cancelAndHoldAtTime(0);
      this.gain.gain.setValueAtTime(this.gain.gain.value, this.audioCtx.currentTime);  // Prevent clicks
      this.gain.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.minLevel * this.setLevel), this.audioCtx.currentTime + this.env.releaseTime + this._minRampTime);  // Ramp to release level
    } else { // Legato mode
      this.sub = timer((this.env.decayTime + this._minRampTime) * 1000).subscribe(() => {
        this.sub.unsubscribe();
        this.gain.gain.cancelAndHoldAtTime(0);
        this.gain.gain.setValueAtTime(this.gain.gain.value, this.audioCtx.currentTime);  // Prevent clicks
        this.gain.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.minLevel * this.setLevel), this.audioCtx.currentTime + this.env.releaseTime + this._minRampTime);  // Ramp to release level
      })
    }
    if(this.releaseFinished) {
      this.releaseFinishedSub = timer((this._minRampTime + (this.useAmplitudeEnvelope ? this.env.releaseTime : 0)) * 1000 + 0.1).subscribe(() => {
        this.releaseFinishedSub?.unsubscribe();
        this.releaseFinishedSub = null;
        // @ts-ignore
        this.releaseFinished();
      });
    }
  }

  // Calculate the minimum envelope time (2 cycles of the relevant frequency) to prevent clicks with fast attack/decay/release
  private minRampTime(frequency: number) {
    this._minRampTime = 1 / frequency;
  }

  connect(arg: AudioNode | AudioParam) {
    if (arg instanceof AudioNode)
      this.amplitudeMod.connect(arg);
    else if (arg instanceof AudioParam)
      this.amplitudeMod.connect(arg);
  }

  disconnect() {
    this.amplitudeMod.disconnect();
  }
}
