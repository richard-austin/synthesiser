import {AfterViewInit, Component, effect, EffectRef, inject, viewChild}  from '@angular/core';
import {SynthComponent} from './synth/synth-component';
import {NgOptimizedImage} from '@angular/common';
import {ConfigFileComponent} from './config-file/config-file.component';
import {SignalService} from './services/signal-service';

@Component({
  selector: 'app-root',
  imports: [SynthComponent, NgOptimizedImage, ConfigFileComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  homeComponent = viewChild.required(ConfigFileComponent)
  signalService = inject(SignalService);

  started = false;
  effectRef: EffectRef;
  constructor() {
    this.effectRef = effect(() => {
      if(this.signalService.configFileComponentControl())
        this.homeComponent().ngOnInit(); // Ensure file list is reloaded
    });
  }
  protected async showHomeForm() {
     this.started = true;
  }
  ngAfterViewInit(): void {
  }
 }
