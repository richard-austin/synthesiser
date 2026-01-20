import { Routes } from '@angular/router';
import {SynthComponent} from './synth/synth-component';
import {HomeComponent} from './home/home.component';

export const routes: Routes = [
  {path: 'synth/:type', component: SynthComponent},
  {path: 'synth/:type/:fileName', component: SynthComponent},
  {path: 'home', component: HomeComponent}
];
