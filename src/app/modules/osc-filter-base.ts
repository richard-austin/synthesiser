import {FreqBendValues} from '../util-classes/freq-bend-values';
import {GainEnvelopeBase} from './gain-envelope-base';

export abstract class OscFilterBase extends GainEnvelopeBase{
  freqBendEnv: FreqBendValues;
  protected useFreqBendEnvelope: boolean;
  public static readonly maxFrequency = 20000;
  public static readonly minFrequency = 0.01;

  protected constructor(audioCtx: AudioContext) {
    super(audioCtx);
    this.freqBendEnv = new FreqBendValues(0, 0, 0, 0, 0, 0);
    this.useFreqBendEnvelope = false;
  }

  freq: number = 0;

  setFreqBendEnvelope(envelope: FreqBendValues) {
    this.freqBendEnv = envelope;
    this.useFreqBendEnvelope = true;
  }

  freqBendEnvelopeOff() {
    this.useFreqBendEnvelope = false;
  }

  clampFrequency(freq: number): number {
    return freq < OscFilterBase.minFrequency ? OscFilterBase.minFrequency :
      freq > OscFilterBase.maxFrequency ? OscFilterBase.maxFrequency :
      freq;
  }

  abstract setFrequency(freq: number): void;

  abstract setType(type: OscillatorType | BiquadFilterType): void;

  abstract setModLevel(level: number): void;

  abstract keyDown(): void;

  abstract keyUp(): void;
}
