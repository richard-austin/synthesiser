import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {modWaveforms, onOff, oscModOutput, oscModType, oscOutputs, oscWaveforms} from '../enums/enums';
import {PortamentoType} from '../oscillator/oscillator.component';

export class OscillatorSettings {
  adsr: ADSRValues;
  freqBend: FreqBendValues;
  frequency: number;
  deTune: number;
  gain: number;
  balance: number;
  waveForm: oscWaveforms;
  output: oscOutputs;
  modFreq: number;
  modLevel: number;
  modType: oscModType;
  modTypeExternal: oscModType;
  modOutput: oscModOutput;
  modWaveform: modWaveforms;
  legatoMode: onOff;
  velocitySensitive: onOff;
  useFrequencyEnvelope: onOff;
  portamento: number
  portamentoType: PortamentoType;

  constructor(adsr: ADSRValues= new ADSRValues(0.0, 3, .4, 3),
              freqBend: FreqBendValues = new FreqBendValues(0, 0.2, .2, 0, .2, 0.0),
              legatoMode: onOff = onOff.off,
              velocitySensitive: onOff = onOff.on,
              useFrequencyEnvelope: onOff = onOff.off,
              frequency: number = 0,
              deTune: number = 0,
              gain: number = .2,
              balance: number = 0,
              waveForm: oscWaveforms = oscWaveforms.sine,
              output: oscOutputs = oscOutputs.speaker,
              modFreq: number = 0,
              modLevel: number=.4,
              modWaveForm: modWaveforms = modWaveforms.sine,
              modType: oscModType = oscModType.off,
              modTypeExternal: oscModType = oscModType.off,
              portamento: number = 0,
              portamentoType: PortamentoType = 'last',
              modOutput: oscModOutput = oscModOutput.direct)
  {
    this.adsr = adsr;
    this.freqBend = freqBend;
    this.legatoMode = legatoMode;
    this.velocitySensitive = velocitySensitive;
    this.useFrequencyEnvelope = useFrequencyEnvelope;
    this.frequency = frequency;
    this.deTune = deTune;
    this.gain = gain;
    this.balance = balance;
    this.waveForm = waveForm;
    this.output = output;
    this.modFreq = modFreq;
    this.modLevel = modLevel;
    this.modWaveform = modWaveForm;
    this.modType = modType;
    this.modTypeExternal = modTypeExternal;
    this.modOutput = modOutput;
    this.portamento = portamento;
    this.portamentoType = portamentoType;
  }
}
