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
  oscillatorSettings: OscillatorSettings[];
  filterSettings: FilterSettings[];
  noiseSettings: NoiseSettings;
  ringModSettings: RingModSettings;
  reverbSettings: ReverbSettings;
  phasorSettings: PhasorSettings;
  generalSettings: GeneralSettings;
  analyserSettings: AnalyserSettings;
  selectedOscillator: number

  constructor(numberOfOscillators: number,
              selectedOscillator: number,
              oscillatorSettings: OscillatorSettings[],
              filterSettings: FilterSettings[],
              noiseSettings: NoiseSettings,
              ringModSettings: RingModSettings,
              reverbSettings: ReverbSettings,
              phasorSettings: PhasorSettings,
              generalSettings: GeneralSettings,
              analyserSettings: AnalyserSettings)
   {
     this.numberOfOscillators = numberOfOscillators;
     this.selectedOscillator = selectedOscillator;
     this.oscillatorSettings = oscillatorSettings;
     this.filterSettings = filterSettings;
     this.noiseSettings = noiseSettings;
     this.ringModSettings = ringModSettings;
     this.reverbSettings = reverbSettings;
     this.phasorSettings = phasorSettings;
     this.generalSettings = generalSettings;
     this.analyserSettings = analyserSettings;
  }
}
