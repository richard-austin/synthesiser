import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';

export abstract class OscFilterBase {
  gain: GainNode;
  mod: GainNode;
  modLevel: number = 0;
  env: ADSRValues;
  freqBendEnv: FreqBendValues;
  private _useAmplitudeEnvelope = false;
  protected useFreqBendEnvelope: boolean;
  protected initialFrequencyFactor: number = 1;
  public static readonly maxLevel: number = 1;
  public static readonly maxFrequency = 20000;

  protected constructor(protected audioCtx: AudioContext) {
    this.gain = this.audioCtx.createGain();

    this.gain.gain.setValueAtTime(1, this.audioCtx.currentTime);
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.mod = this.audioCtx.createGain();
    this.mod.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.freqBendEnv = new FreqBendValues(0, 0, 0, 0, 0, 0);
    this.useFreqBendEnvelope = false;
  }

  freq: number = 0;

  setAmplitudeEnvelope(env: ADSRValues) {
    this.env = env;
  }

  setFreqBendEnvelope(envelope: FreqBendValues) {
    this.freqBendEnv = envelope;
    this.useFreqBendEnvelope = true;
    this.initialFrequencyFactor = envelope.releaseLevel;
  }

  freqBendEnvelopeOff() {
    this.useFreqBendEnvelope = false;
  }

  connect(params: AudioNode) {
    this.gain.connect(params);
  }

  clampFrequency(freq: number): number {
    return freq <= OscFilterBase.maxFrequency ?
      freq >= 0 ? freq :
        freq : OscFilterBase.maxFrequency;
  }

  modulator!: OscillatorNode;

  modulationOff() {
    if (this.modulator)
      this.modulator.disconnect()
    this.mod.disconnect();
    this.mod.gain.setValueAtTime(0, this.audioCtx.currentTime);
  }

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
      this.gain.gain.setValueAtTime(0, ctx.currentTime);
      this.gain.gain.linearRampToValueAtTime(OscFilterBase.maxLevel, ctx.currentTime + this.env.attackTime);
      this.gain.gain.linearRampToValueAtTime(this.env.sustainLevel, ctx.currentTime + this.env.attackTime + this.env.decayTime);
    }
  }

  release() {
    const ctx = this.audioCtx;
    if (this.useAmplitudeEnvelope) {
      this.gain.gain.cancelAndHoldAtTime(ctx.currentTime);
      this.gain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + this.env.releaseTime);
    }
  }

  abstract setFrequency(freq: number): void;

  abstract setType(type: OscillatorType | BiquadFilterType): void;

  abstract modulation(modulator: OscillatorNode): void;

  abstract setModLevel(level: number): void;

  abstract keyDown(): void;

  abstract keyUp(): void;
}
