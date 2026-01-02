import { Component } from '@angular/core';
import {SynthComponent} from '../synth-component';
import {AnalyserComponent} from '../../analyser/analyser-component';
import {FilterComponent} from '../../filter/filter-component';
import {MasterVolumeComponent} from '../../master-volume/master-volume-component';
import {NoiseComponent} from '../../noise/noise-component';
import {OscillatorComponent} from '../../oscillator/oscillator.component';
import {PhasorComponent} from '../../phasor/phasor-component';
import {ReverbComponent} from '../../reverb-component/reverb-component';
import {RingModulatorComponent} from '../../ring-modulator/ring-modulator-component';

@Component({
  selector: 'app-monophonic-synth-component',
  imports: [
    AnalyserComponent,
    FilterComponent,
    MasterVolumeComponent,
    NoiseComponent,
    OscillatorComponent,
    PhasorComponent,
    ReverbComponent,
    RingModulatorComponent
  ],
  templateUrl: './monophonic-synth-component.html',
  styleUrl: './monophonic-synth-component.scss',
})
export class MonophonicSynthComponent extends SynthComponent {
    constructor() {
      super();
      this.numberOfOscillators = 1;
    }
}
