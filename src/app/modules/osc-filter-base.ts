import {FreqBendValues} from '../util-classes/freq-bend-values';
import {GainEnvelopeBase} from './gain-envelope-base';

export abstract class OscFilterBase extends GainEnvelopeBase{
  freqBendEnv: FreqBendValues;
  protected _useFreqBendEnvelope: boolean;
  public static readonly maxFrequency = 20000;
  public static readonly minFrequency = 0.01;

  protected constructor(audioCtx: AudioContext) {
    super(audioCtx);
    this.freqBendEnv = new FreqBendValues(0, 0, 0, 0, 0, 0);
    this._useFreqBendEnvelope = false;
  }

  freq: number = 0;

  setFreqBendEnvelope(envelope: FreqBendValues) {
    this.freqBendEnv = envelope;
    this._useFreqBendEnvelope = true;
  }

  useFreqBendEnvelope(useFreqBendEnvelope: boolean) {
    this._useFreqBendEnvelope = useFreqBendEnvelope;
  }

  clampFrequency(freq: number): number {
    return freq < OscFilterBase.minFrequency ? OscFilterBase.minFrequency :
      freq > OscFilterBase.maxFrequency ? OscFilterBase.maxFrequency :
      freq;
  }

  abstract setFrequency(freq: number): void;

  abstract setType(type: OscillatorType | BiquadFilterType): void;

  abstract setModLevel(level: number): void;

  abstract keyDown(velocity: number): void;

  abstract keyUp(): void;
}
