import {ADSRValues} from '../util-classes/adsrvalues';
import {OscFilterBase} from './osc-filter-base';

export enum modulationType {
  frequency = 'frequency',
  amplitude = 'amplitude',
  off = 'off'
}

export abstract class GainEnvelopeBase {
  public readonly gain: GainNode;
  frequencyMod: GainNode;
  amplitudeMod: GainNode;
  amplitudeModDepth: GainNode;
  modType: modulationType;
  protected modLevel: number = 0;
  private _useAmplitudeEnvelope = false;
  env: ADSRValues;
  modulator!: AudioNode;
  protected setLevel: number;
  public static readonly maxLevel: number = 1;
  public static readonly minLevel: number = 0.000001;

  protected constructor(protected audioCtx: AudioContext) {
    this.gain = audioCtx.createGain();
    this.setLevel = 0;
    this.gain.gain.setValueAtTime(this.setLevel, audioCtx.currentTime);
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.frequencyMod = audioCtx.createGain();
    this.frequencyMod.gain.setValueAtTime(0, audioCtx.currentTime);
    this.amplitudeMod = audioCtx.createGain();
    this.amplitudeMod.gain.setValueAtTime(1, audioCtx.currentTime);
    this.amplitudeModDepth = audioCtx.createGain();
    this.amplitudeModDepth.gain.setValueAtTime(0, audioCtx.currentTime);
    this.gain.connect(this.amplitudeMod);
    this.amplitudeModDepth.connect(this.amplitudeMod.gain);
    this.modType = modulationType.amplitude;
  }

  setGain(gain: number) {
    this.setLevel = this.clampLevel(gain);
    let gainToUse = gain;
    if (this._useAmplitudeEnvelope)
      gainToUse = this.clampLevel(gain * OscFilterBase.minLevel);
    this.gain.gain.setValueAtTime(this.clampLevel(gainToUse), this.audioCtx.currentTime);
  }

  setAmplitudeEnvelope(env: ADSRValues) {
    this.env = env;
    this.gain.gain.setValueAtTime(this.clampLevel(this.setLevel * OscFilterBase.minLevel), this.audioCtx.currentTime);
  }

  modulationOff() {
    if (this.modulator)
      this.modulator.disconnect()
    this.frequencyMod.disconnect();
    this.frequencyMod.gain.setValueAtTime(1, this.audioCtx.currentTime);
  }

  abstract modulation(modulator: AudioNode, type: modulationType): void;

  public set useAmplitudeEnvelope(useAmplitudeEnvelope: boolean) {
    this._useAmplitudeEnvelope = useAmplitudeEnvelope;
    let gainToUse = this.setLevel;
    if (this._useAmplitudeEnvelope)
      gainToUse = this.clampLevel(gainToUse * OscFilterBase.minLevel);
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

  attack() {
    const ctx = this.audioCtx;
    if (this.useAmplitudeEnvelope) {
      const setLevel = this.setLevel;
      this.gain.gain.cancelAndHoldAtTime(ctx.currentTime);
      this.gain.gain.setValueAtTime(this.clampLevel(GainEnvelopeBase.minLevel * setLevel), ctx.currentTime);
      this.gain.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.maxLevel * setLevel), ctx.currentTime + this.env.attackTime);
      this.gain.gain.exponentialRampToValueAtTime(this.clampLevel(this.env.sustainLevel * setLevel), ctx.currentTime + this.env.attackTime + this.env.decayTime);
    }
  }

  release() {
    const ctx = this.audioCtx;
    if (this.useAmplitudeEnvelope) {
      this.gain.gain.cancelAndHoldAtTime(ctx.currentTime);
      this.gain.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.minLevel * this.setLevel), ctx.currentTime + this.env.releaseTime);
    }
  }

  connect(arg: AudioNode| AudioParam)
  {
    if(arg instanceof AudioNode)
      this.amplitudeMod.connect(arg);
    else if (arg instanceof AudioParam)
      this.amplitudeMod.connect(arg);
  }

  disconnect() {
      this.amplitudeMod.disconnect();
  }
}
