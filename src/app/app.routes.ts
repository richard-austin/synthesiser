import { Routes } from '@angular/router';
import {SynthComponent} from './synth/synth-component';
import {MonophonicSynthComponent} from './synth/monophonic-synth/monophonic-synth-component';

export const routes: Routes = [
  {path: 'poly', component: SynthComponent},
  {path: 'mono', component: MonophonicSynthComponent}
];
