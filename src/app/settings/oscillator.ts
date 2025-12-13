import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {modWaveforms, onOff, oscModType, oscOutputs, oscWaveforms} from '../enums/enums';

export class OscillatorSettings {
  adsr: ADSRValues;
  freqBend: FreqBendValues;
  frequency: number;
  gain: number;
  waveForm: oscWaveforms;
  output: oscOutputs;
  modFreq: number;
  modLevel: number;
  modType: oscModType;
  modWaveform: modWaveforms;
  useAmplitudeEnvelope: onOff;
  useFrequencyEnvelope: onOff;

  constructor(adsr: ADSRValues= new ADSRValues(0.0, 3, 4, 3),
              freqBend: FreqBendValues = new FreqBendValues(8, 1.5, 2, 1, 2, 0.0),
              useAmplitudeEnvelope: onOff = onOff.on,
              useFrequencyEnvelope: onOff = onOff.off,
              frequency: number = 0,
              gain: number = 4,
              waveForm: oscWaveforms = oscWaveforms.sine,
              output: oscOutputs = oscOutputs.speaker,
              modFreq: number = 0,
              modLevel: number=4,
              modWaveForm: modWaveforms = modWaveforms.sine,
              modType: oscModType = oscModType.off)
  {
    this.adsr = adsr;
    this.freqBend = freqBend;
    this.useAmplitudeEnvelope = useAmplitudeEnvelope;
    this.useFrequencyEnvelope = useFrequencyEnvelope;
    this.frequency = frequency;
    this.gain = gain;
    this.waveForm = waveForm;
    this.output = output;
    this.modFreq = modFreq;
    this.modLevel = modLevel;
    this.modWaveform = modWaveForm;
    this.modType = modType;
  }
}
