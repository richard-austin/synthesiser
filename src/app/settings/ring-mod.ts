import {modWaveforms, onOff, ringModOutput} from '../enums/enums';

export class RingModSettings {
  modFrequency: number;
  modDepth: number;
  modWaveform: modWaveforms;
  internalMod: onOff;
  output: ringModOutput;

  // Constructor sets default values
  constructor(modFrequency: number=5,
              modDepth: number=5,
              modWaveform: modWaveforms=modWaveforms.sine,
              internalMod: onOff = onOff.off,
              output: ringModOutput=ringModOutput.off) {
    this.modFrequency = modFrequency;
    this.modDepth = modDepth;
    this.modWaveform = modWaveform;
    this.internalMod = internalMod;
    this.output = output;
  }
}
