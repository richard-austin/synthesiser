import {modWaveforms, onOff, phasorOutputs} from '../enums/enums';

export class PhasorSettings {
  phase: number;
  gain: number;
  lfoFrequency: number;
  modWaveform: modWaveforms;
  modDepth: number;
  modulation: onOff;
  output: phasorOutputs;
  feedback: number;
  stages: number;
  wetDry: number

  constructor(phase: number = 0,
              gain: number = 0,
              lfoFrequency: number = .2,
              modDepth: number = .3,
              modWaveform: modWaveforms = modWaveforms.sine,
              modulation: onOff = onOff.off,
              output: phasorOutputs = phasorOutputs.off,
              feedback: number = 0,
              stages: number = 11,
              wetDry: number = 0) {
    this.phase = phase;
    this.gain = gain;
    this.lfoFrequency = lfoFrequency;
    this.modDepth = modDepth;
    this.modWaveform = modWaveform;
    this.modulation = modulation;
    this.output = output;
    this.feedback = feedback;
    this.stages = stages;
    this.wetDry = wetDry;
  }
}
