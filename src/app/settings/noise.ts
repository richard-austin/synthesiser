import {ADSRValues} from '../util-classes/adsrvalues';
import {noiseOutputs, noiseTypes, onOff} from '../enums/enums';

export class NoiseSettings {
  adsr: ADSRValues
  useAmplitudeEnvelope: onOff;
  gain: number;
  type: noiseTypes;
  output: noiseOutputs;

  constructor(adsr: ADSRValues = new ADSRValues(0.0, 0.5, .1, .4),
              useAmplitudeEnvelope: onOff = onOff.on,
              gain: number = .11,
              type:noiseTypes = noiseTypes.white,
              output: noiseOutputs = noiseOutputs.off) {
    this.adsr = adsr;
    this.useAmplitudeEnvelope = useAmplitudeEnvelope;
    this.gain = gain;
    this.type = type;
    this.output = output;
  }
}
