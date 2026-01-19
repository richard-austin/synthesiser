import { Routes } from '@angular/router';
import {SynthComponent} from './synth/synth-component';

export const routes: Routes = [
  {path: 'synth/:type', component: SynthComponent},
  {path: 'synth/:type/:fileName', component: SynthComponent}
];
