import { Routes } from '@angular/router';

export const routes: Routes = [
  {path: 'polyphonicSynth', loadComponent: () => import('./synth/synth-component').then(m => m.SynthComponent)}
];
