import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';

export abstract class OscFilterBase {
  gain: GainNode;
  mod: GainNode;
  modLevel: number = 0;
  env: ADSRValues;
  freqBendEnv: FreqBendValues;
  protected useFreqBendEnvelope: boolean;
  public static readonly maxLevel: number = 1;
  public static readonly maxFrequency = 20000;


  constructor(protected audioCtx: AudioContext) {
    this.gain = this.audioCtx.createGain();

    this.gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.mod = this.audioCtx.createGain();
    this.mod.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.freqBendEnv = new FreqBendValues(0, 0, 0, 0,0);
    this.useFreqBendEnvelope = false;
  }

  freq: number = 0;
  setAmplitudeEnvelope(env: ADSRValues) {
    this.env = env;
  }

  setFreqBendEnvelope(envelope: FreqBendValues) {
    this.freqBendEnv = envelope;
    this.useFreqBendEnvelope = true;
  }
  freqBendEnvelopeOff() {
    this.useFreqBendEnvelope = false;
  }

  connect(params: AudioNode) {
    this.gain.connect(params);
  }

  modulator!: OscillatorNode;
  modulationOff() {
    if(this.modulator)
      this.modulator.disconnect()
    this.mod.disconnect();
    this.mod.gain.setValueAtTime(0, this.audioCtx.currentTime);
  }

  abstract setFrequency(freq: number): void;
  abstract setType(type: OscillatorType|BiquadFilterType): void;
  abstract modulation(modulator: OscillatorNode): void;
  abstract setModLevel(level: number): void;
  keyDown(): void {
    this.gain.gain.cancelAndHoldAtTime(this.audioCtx.currentTime);
    this.gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.gain.gain.linearRampToValueAtTime(OscFilterBase.maxLevel, this.audioCtx.currentTime + this.env.attackTime);
    this.gain.gain.linearRampToValueAtTime(this.env.sustainLevel, this.audioCtx.currentTime + this.env.attackTime + this.env.decayTime);
  };
  abstract keyUp(): void;
}
