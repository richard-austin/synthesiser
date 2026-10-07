import {AfterViewInit, Component, effect, EffectRef, inject, signal, viewChild} from '@angular/core';
import {SynthComponent} from './synth/synth-component';
import {NgOptimizedImage} from '@angular/common';
import {ConfigFileComponent} from './config-file/config-file.component';
import {SignalService} from './services/signal-service';
import {RestfulApiService} from './services/restful-api.service';

@Component({
  selector: 'app-root',
  imports: [SynthComponent, NgOptimizedImage, ConfigFileComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  homeComponent = viewChild.required(ConfigFileComponent)
  signalService = inject(SignalService);
  restfulApiService = inject(RestfulApiService);

  started = false;
  effectRef: EffectRef;
  protected versionNumber = signal("");
  constructor() {
    this.effectRef = effect(() => {
      if(this.signalService.configFileComponentControl())
        this.homeComponent().ngOnInit(); // Ensure file list is reloaded
    });
    this.restfulApiService.getVersion().subscribe((result:{version: string}) => {
      this.versionNumber.set(result.version);
    });
  }
  protected async showHomeForm() {
     this.started = true;
  }
  ngAfterViewInit(): void {
  }
 }
