import {ADSRValues} from '../util-classes/adsrvalues';

export abstract class GainEnvelopeBase {
  protected gain: GainNode;
  mod: GainNode;
  modLevel: number = 0;
  private _useAmplitudeEnvelope = false;
  env: ADSRValues;
  modulator!: OscillatorNode;

  public static readonly maxLevel: number = 1;
  public static readonly minLevel: number = 0.001;

  protected constructor(protected audioCtx:AudioContext) {
    this.gain = audioCtx.createGain();

    this.gain.gain.setValueAtTime(0, audioCtx.currentTime);
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.mod = audioCtx.createGain();
    this.mod.gain.setValueAtTime(0, audioCtx.currentTime);
  }
  setAmplitudeEnvelope(env: ADSRValues) {
    this.env = env;
  }

  modulationOff() {
    if (this.modulator)
      this.modulator.disconnect()
    this.mod.disconnect();
    this.mod.gain.setValueAtTime(0, this.audioCtx.currentTime);
  }

  abstract modulation(modulator: OscillatorNode): void;

  public set useAmplitudeEnvelope(useAmplitudeEnvelope: boolean) {
    this._useAmplitudeEnvelope = useAmplitudeEnvelope;
  }

  public get useAmplitudeEnvelope() {
    return this._useAmplitudeEnvelope;
  }

  attack() {
    const ctx = this.audioCtx;
    if (this.useAmplitudeEnvelope) {
      this.gain.gain.cancelAndHoldAtTime(ctx.currentTime);
      this.gain.gain.setValueAtTime(GainEnvelopeBase.minLevel, ctx.currentTime);
      this.gain.gain.exponentialRampToValueAtTime(GainEnvelopeBase.maxLevel, ctx.currentTime + this.env.attackTime);
      this.gain.gain.exponentialRampToValueAtTime(this.env.sustainLevel, ctx.currentTime + this.env.attackTime + this.env.decayTime+1);
    }
  }

  release() {
    const ctx = this.audioCtx;
    if (this.useAmplitudeEnvelope) {
      this.gain.gain.cancelAndHoldAtTime(ctx.currentTime);
      this.gain.gain.exponentialRampToValueAtTime(GainEnvelopeBase.minLevel, ctx.currentTime + this.env.releaseTime);
    }
  }

  connect(params: AudioNode) {
    this.gain.connect(params);
  }
}
