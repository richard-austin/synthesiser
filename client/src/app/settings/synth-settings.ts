import {OscillatorSettings} from './oscillator';
import {FilterSettings} from './filter';
import {NoiseSettings} from './noise';
import {RingModSettings} from './ring-mod';
import {ReverbSettings} from './reverb';
import {PhasorSettings} from './phasor';
import {GeneralSettings} from './General';
import {AnalyserSettings} from './analyser-settings';
import {SynthComponentSettings} from './synth-component-settings';
import {SynthComponent} from '../synth/synth-component';
import {MatrixSettings} from './matrix';

export class SynthSettings {
  synthComponentSettings: SynthComponentSettings;
  oscillatorSettings: OscillatorSettings[];
  filterSettings: FilterSettings[];
  noiseSettings: NoiseSettings;
  ringModSettings: RingModSettings;
  reverbSettings: ReverbSettings;
  phasorSettings: PhasorSettings;
  generalSettings: GeneralSettings;
  analyserSettings: AnalyserSettings;
  matrixSettings: MatrixSettings;

  constructor(synthComponentSettings: SynthComponentSettings = new SynthComponentSettings(),
              oscillatorSettings: OscillatorSettings[] = new Array(SynthComponent.oscillatorParams.length).fill(new OscillatorSettings()),
              filterSettings: FilterSettings[] = new Array(SynthComponent.oscillatorParams.length).fill(new FilterSettings()),
              noiseSettings: NoiseSettings = new NoiseSettings(),
              ringModSettings: RingModSettings = new RingModSettings(),
              matrixSettings: MatrixSettings = new MatrixSettings(),
              reverbSettings: ReverbSettings = new ReverbSettings(),
              phasorSettings: PhasorSettings = new PhasorSettings(),
              generalSettings: GeneralSettings = new GeneralSettings(),
              analyserSettings: AnalyserSettings = new AnalyserSettings())
   {
     this.synthComponentSettings = synthComponentSettings;
     this.oscillatorSettings = oscillatorSettings;
     this.filterSettings = filterSettings;
     this.noiseSettings = noiseSettings;
     this.ringModSettings = ringModSettings;
     this.reverbSettings = reverbSettings;
     this.phasorSettings = phasorSettings;
     this.generalSettings = generalSettings;
     this.analyserSettings = analyserSettings;
     this.matrixSettings = matrixSettings;
  }
}
