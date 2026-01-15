import {OscillatorSettings} from './oscillator';
import {FilterSettings} from './filter';
import {NoiseSettings} from './noise';
import {RingModSettings} from './ring-mod';
import {ReverbSettings} from './reverb';
import {PhasorSettings} from './phasor';
import {GeneralSettings} from './General';
import {AnalyserSettings} from './analyser-settings';

export class SynthSettings {
  numberOfOscillators: number;
  oscillator1Settings: OscillatorSettings
  oscillator2Settings: OscillatorSettings
  filterSettings: FilterSettings;
  noiseSettings: NoiseSettings;
  ringModSettings: RingModSettings;
  reverbSettings: ReverbSettings;
  phasorSettings: PhasorSettings;
  generalSettings: GeneralSettings;
  analyserSettings: AnalyserSettings;

  constructor(numberOfOscillators: number,
              oscillator1Settings: OscillatorSettings,
              oscillator2Settings: OscillatorSettings,
              filterSettings: FilterSettings,
              noiseSettings: NoiseSettings,
              ringModSettings: RingModSettings,
              reverbSettings: ReverbSettings,
              phasorSettings: PhasorSettings,
              generalSettings: GeneralSettings,
              analyserSettings: AnalyserSettings)
   {
     this.numberOfOscillators = numberOfOscillators;
     this.oscillator1Settings = oscillator1Settings;
     this.oscillator2Settings = oscillator2Settings;
     this.filterSettings = filterSettings;
     this.noiseSettings = noiseSettings;
     this.ringModSettings = ringModSettings;
     this.reverbSettings = reverbSettings;
     this.phasorSettings = phasorSettings;
     this.generalSettings = generalSettings;
     this.analyserSettings = analyserSettings;
  }
}
