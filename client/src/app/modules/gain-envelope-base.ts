import {ADSRValues} from '../util-classes/adsrvalues';
import {OscFilterBase} from './osc-filter-base';
import {filterModType, oscModType} from '../enums/enums';

export abstract class GainEnvelopeBase {
  protected readonly envelope: GainNode;
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
  private _legatoMode = false;
  env: ADSRValues;
  modulator!: AudioNode;

  public static readonly maxLevel: number = 1;
  public static readonly minLevel: number = 0.000001;

  protected constructor(protected audioCtx: AudioContext) {
    this.envelope = audioCtx.createGain();
    this.envelope.gain.value = 1;

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
    this.envelope.connect(this.amplitudeMod);
    this.amplitudeModDepth.connect(this.amplitudeMod.gain);
    this.amplitudeMod2Depth.connect(this.amplitudeMod.gain);
    this.modType = oscModType.amplitude;
    this.modType2 = oscModType.amplitude;
  }

  public static exponentiateGain(gain: number) {
    return (Math.pow(10, gain) - 1) / (Math.pow(10, 1) - 1);
  }

  setAmplitudeEnvelope(env: ADSRValues) {
    this.env = env;
    this.envelope.gain.setValueAtTime(this.clampLevel(OscFilterBase.minLevel), this.audioCtx.currentTime);
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

  public set legatoMode(useAmplitudeEnvelope: boolean) {
    this._legatoMode = useAmplitudeEnvelope;
    let gainToUse = this.clampLevel(OscFilterBase.minLevel);
    this.envelope.gain.cancelAndHoldAtTime(this.audioCtx.currentTime);
    this.envelope.gain.setValueAtTime(this.clampLevel(gainToUse), this.audioCtx.currentTime);
  }

  public get legatoMode() {
    return this._legatoMode;
  }

  clampLevel(level: number) {
    return level < GainEnvelopeBase.minLevel ? GainEnvelopeBase.minLevel :
      level > GainEnvelopeBase.maxLevel ? GainEnvelopeBase.maxLevel :
        level;
  }

  private _minRampTime: number = 0.03125;
  velocity!: number;

  attack(velocity: number, frequency: number = 2000) {
    this.minRampTime(frequency);
    const currentTime = this.audioCtx.currentTime;
    if (this.legatoMode) {
      this.velocity = Math.pow(velocity / 127, .75);
      this.envelope.gain.cancelAndHoldAtTime(currentTime);
      this.envelope.gain.setTargetAtTime(this.clampLevel(GainEnvelopeBase.maxLevel * this.velocity), currentTime, (this.env.attackTime + this._minRampTime)/10); // Ramp to attack level
      this.envelope.gain.setTargetAtTime(this.clampLevel(this.env.sustainLevel * this.velocity), currentTime + this.env.attackTime + this._minRampTime, (this.env.decayTime + this._minRampTime) / 10);  // Ramp to sustain level
    } else { // Legato mode
      this.envelope.gain.cancelAndHoldAtTime(currentTime);
      this.envelope.gain.setValueAtTime(this.envelope.gain.value, currentTime);  // Prevent clicks
      this.envelope.gain.linearRampToValueAtTime(this.clampLevel(GainEnvelopeBase.maxLevel), currentTime + this.env.attackTime + this._minRampTime); // Ramp to attack level
    }
  }

  release(frequency: number = 2000) {
    const currentTime = this.audioCtx.currentTime;
    this.minRampTime(frequency);
    if (this.legatoMode) {
      this.envelope.gain.cancelAndHoldAtTime(0);
      this.envelope.gain.setTargetAtTime(this.clampLevel(GainEnvelopeBase.minLevel), currentTime, (this.env.releaseTime + this._minRampTime) / 10);  // Ramp to release level
    } else { // Legato mode
      this.envelope.gain.cancelAndHoldAtTime(currentTime + this.env.decayTime + this._minRampTime);
      this.envelope.gain.setTargetAtTime(this.clampLevel(GainEnvelopeBase.minLevel), currentTime + this.env.decayTime + this._minRampTime, (this.env.releaseTime + this._minRampTime)/10);  // Ramp to release level
    }
  }

  // Calculate the minimum envelope time (2 cycles of the relevant frequency) to prevent clicks with fast attack/decay/release
  private minRampTime(frequency: number) {
    this._minRampTime = .05; //5 / frequency;
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
