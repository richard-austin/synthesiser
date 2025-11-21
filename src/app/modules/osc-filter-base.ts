import {FreqBendValues} from '../util-classes/freq-bend-values';
import {GainEnvelopeBase} from './gain-envelope-base';

export abstract class OscFilterBase extends GainEnvelopeBase{
  freqBendEnv: FreqBendValues;
  protected useFreqBendEnvelope: boolean;
  protected initialFrequencyFactor: number = 1;
  public static readonly maxFrequency = 20000;

  protected constructor(audioCtx: AudioContext) {
    super(audioCtx);
    this.freqBendEnv = new FreqBendValues(0, 0, 0, 0, 0, 0);
    this.useFreqBendEnvelope = false;
  }

  freq: number = 0;

  setFreqBendEnvelope(envelope: FreqBendValues) {
    this.freqBendEnv = envelope;
    this.useFreqBendEnvelope = true;
    this.initialFrequencyFactor = envelope.releaseLevel;
  }

  freqBendEnvelopeOff() {
    this.useFreqBendEnvelope = false;
  }

  clampFrequency(freq: number): number {
    return freq <= OscFilterBase.maxFrequency ?
      freq >= 0 ? freq :
        freq : OscFilterBase.maxFrequency;
  }

  abstract setFrequency(freq: number): void;

  abstract setType(type: OscillatorType | BiquadFilterType): void;

  abstract setModLevel(level: number): void;

  abstract keyDown(): void;

  abstract keyUp(): void;
}
