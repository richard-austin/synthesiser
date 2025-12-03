import { Routes } from '@angular/router';

export const routes: Routes = [
  {path: 'polyphonicSynth', loadComponent: () => import('./synth-component/synth-component').then(m => m.SynthComponent)}
];
