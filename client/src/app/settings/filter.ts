import {PitchEnvValues} from '../util-classes/pitch-env-values';
import {
  filterModType,
  filterOutputs,
  modWaveforms,
  onOff,
} from '../enums/enums';
import {PortamentoType} from '../oscillator/oscillator.component';

export class FilterSettings {
  freqBend: PitchEnvValues;
  frequency: number;
  qFactor: number;
  gain: number;
  filterType: number;
  output: filterOutputs;
  modFreq: number;
  modLevel: number;
  modType: filterModType;
  modWaveform: modWaveforms;
  useFrequencyEnvelope: onOff;
  deTune: number;
  portamento: number
  portamentoType: PortamentoType;

  constructor(freqBend: PitchEnvValues = new PitchEnvValues(0, 1, 2, 0.5, 0.1, 0.0),
              useFrequencyEnvelope: onOff = onOff.off,
              frequency: number = 0,
              deTune: number = 0,
              qFactor: number = 20,
              gain: number = .4,
              filterType: number = 0,
              output: filterOutputs = filterOutputs.off,
              modFreq: number = 2,
              modLevel: number=.4,
              modWaveForm: modWaveforms = modWaveforms.sine,
              modType: filterModType = filterModType.off,
              portamento: number = 0,
              portamentoType: PortamentoType = 'off')
  {
    this.freqBend = freqBend;
    this.useFrequencyEnvelope = useFrequencyEnvelope;
    this.frequency = frequency;
    this.deTune = deTune;
    this.qFactor = qFactor;
    this.gain = gain;
    this.filterType = filterType;
    this.output = output;
    this.modFreq = modFreq;
    this.modLevel = modLevel;
    this.modWaveform = modWaveForm;
    this.modType = modType;
    this.portamento = portamento;
    this.portamentoType = portamentoType;
  }
}
