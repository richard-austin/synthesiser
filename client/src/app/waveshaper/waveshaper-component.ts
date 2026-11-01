import {afterNextRender, Component, ElementRef, inject, viewChild} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {FormsModule} from '@angular/forms';
import {WaveshaperSettings} from '../settings/waveshaper-settings';
import {IndexedDBService} from '../services/indexed-db-service';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {PhasorSettings} from '../settings/phasor';

@Component({
  imports: [
    LevelControlComponent,
    FormsModule
  ],
  selector: 'app-waveshaper',
  styleUrl: './waveshaper-component.scss',
  templateUrl: './waveshaper-component.html',
})
export class WaveshaperComponent {
  private proxySettings!: WaveshaperSettings;
  private readonly amount: number = 0.95
  private _ws!: WaveShaperNode;
  private _wsInput!: GainNode;
  private _wsOutput!: GainNode;

  drive = viewChild.required<LevelControlComponent>('drive');
  wetDry = viewChild.required<LevelControlComponent>('wetDry');
  mode =  viewChild.required<ElementRef<HTMLFormElement>>('waveshaperModeForm');
  output = viewChild.required<ElementRef<HTMLFormElement>>('waveshaperOnOffForm');

 indexedDBService: IndexedDBService = inject(IndexedDBService);

 constructor() {
   afterNextRender({
     write: ()=> {
       const waveshaperMode = this.mode().nativeElement;
       for (let j = 0; j < waveshaperMode.elements.length; ++j) {
         waveshaperMode.elements[j].addEventListener('change', ($event) => {
           // @ts-ignore
           const value = $event.target.value;
           this.setMode(value);
           this.proxySettings.mode = value;
         });
       }

       const waveshaperOutput = this.output().nativeElement;
       for (let j = 0; j < waveshaperOutput.elements.length; ++j) {
         waveshaperOutput.elements[j].addEventListener('change', ($event) => {
           // @ts-ignore
           const value = $event.target.value;
           this.setOutput(value);
           this.proxySettings.output = value;
         });
       }
     }
   })
 }
 async start(audioCtx: AudioContext, settings: WaveshaperSettings | null) : Promise<void> {
   this._ws = audioCtx.createWaveShaper();
   this._wsInput = audioCtx.createGain();
   this._wsOutput = audioCtx.createGain();

   await this.applySettings(audioCtx, settings);
 }

 async applySettings(audioCtx: AudioContext, settings: WaveshaperSettings | null) {
   const objectName = 'waveshaper';
   if (!settings) {
     settings = new WaveshaperSettings();
     const savedSettings = await this.indexedDBService.getSynthObject(objectName);

     if (savedSettings && Object.keys(savedSettings).length > 0) {
       // Use values from indexed DB
       settings = savedSettings as WaveshaperSettings;
     }
     // else use default settings
   }
   this.proxySettings = this.indexedDBService.getSettingsProxy(settings, objectName);
    this.drive().setValue(settings.drive);
    this.wetDry().setValue(settings.wetDry);
    SetRadioButtons.set(this.output(), this.proxySettings.output);
    SetRadioButtons.set(this.mode(), this.proxySettings.mode);

   this._setCurve(settings.mode);
   this._wsInput.gain.value = settings.drive;
   this._wsOutput.gain.value = Math.pow(1.0/settings.drive, 0.6);
   // this._wsInput.connect(this._ws);
   // this._ws.connect(this._wsOutput);

 }


  _setCurve(mode: string) {
    let n = 65536;
    let curve = new Float32Array(n);
    let amt = Math.min(this.amount, 0.9999);
    let k = 2 * amt / (1 - amt);

    for (let i = 0; i < n; i++) {
      let x = (i - (n / 2)) / (n / 2);
      let x1 = (Math.abs(x)-0.5) * 2;
      // Identity
      // curve[i] = x;

      // curve[i] = (1 + k) * x / (1 + k * Math.abs(x))

      // Hard clipping
      //curve[i] = 0.5 * (Math.abs(x + 0.63) - Math.abs(x - 0.63));

      // Soft clipping
      curve[i] = Math.tanh(x1);

      // Soft clipping cubic approximation
      // curve[i] = x - Math.pow(x, 3) / 4;
    }

    this._ws.curve = curve;
    this._ws.oversample = '2x';
  }

  protected readonly dialStyle = dialStyle;

  public getSettings(): WaveshaperSettings {
    return this.proxySettings;
  }

  protected setDrive($event: number) {
    this.proxySettings.drive = $event;
  }

  protected setWetDryBalance($event: number) {
    this.proxySettings.wetDry = $event;
  }

  setMode(mode: string) {
    this.proxySettings.mode = mode;
  }

  setOutput(output: string) {
    this.proxySettings.output = output;
  }
}
