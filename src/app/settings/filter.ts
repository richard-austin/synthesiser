import {FreqBendValues} from '../util-classes/freq-bend-values';
import {
  filterModType,
  filterOutputs,
  filterTypes,
  modWaveforms,
  onOff,
} from '../enums/enums';

export class FilterSettings {
  freqBend: FreqBendValues;
  frequency: number;
  qFactor: number;
  gain: number;
  filterType: filterTypes;
  output: filterOutputs;
  modFreq: number;
  modLevel: number;
  modType: filterModType;
  modWaveform: modWaveforms;
  useFrequencyEnvelope: onOff;
  deTune: number;

  constructor(freqBend: FreqBendValues = new FreqBendValues(0, 1, 2, 0.5, 0.1, 0.0),
              useFrequencyEnvelope: onOff = onOff.off,
              frequency: number = 0,
              deTune: number = 0,
              qFactor: number = 20,
              gain: number = .4,
              filterType: filterTypes = filterTypes.lowpass,
              output: filterOutputs = filterOutputs.off,
              modFreq: number = 2,
              modLevel: number=.4,
              modWaveForm: modWaveforms = modWaveforms.sine,
              modType: filterModType = filterModType.off)
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
  }
}
