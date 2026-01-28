import { Routes } from '@angular/router';
import {SynthComponent} from './synth/synth-component';
import {HomeComponent} from './home/home.component';

export const routes: Routes = [
  {path: 'synth/:fileName', component: SynthComponent},
  {path: 'synth', component: SynthComponent},
  {path: 'home', component: HomeComponent}
];
