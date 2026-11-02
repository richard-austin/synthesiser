import {afterNextRender, Component, ElementRef, inject, output, OutputEmitterRef, viewChild} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {FormsModule} from '@angular/forms';
import {WaveshaperSettings} from '../settings/waveshaper-settings';
import {IndexedDBService} from '../services/indexed-db-service';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {timer} from 'rxjs';

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
  private _wetGain!: GainNode;
  private _dryGain!: GainNode;
  nodesCreated = false;

  drive = viewChild.required<LevelControlComponent>('drive');
  wetDry = viewChild.required<LevelControlComponent>('wetDry');
  mode = viewChild.required<ElementRef<HTMLFormElement>>('waveshaperModeForm');
  outputTo = viewChild.required<ElementRef<HTMLFormElement>>('waveshaperOnOffForm');

  output: OutputEmitterRef<string> = output<string>();

  indexedDBService: IndexedDBService = inject(IndexedDBService);

  constructor() {
    afterNextRender({
      write: () => {
        const waveshaperMode = this.mode().nativeElement;
        for (let j = 0; j < waveshaperMode.elements.length; ++j) {
          waveshaperMode.elements[j].addEventListener('change', ($event) => {
            // @ts-ignore
            const value = $event.target.value;
            this.setMode(value);
            this.proxySettings.mode = value;
          });
        }

        const waveshaperOutput = this.outputTo().nativeElement;
        for (let j = 0; j < waveshaperOutput.elements.length; ++j) {
          waveshaperOutput.elements[j].addEventListener('change', ($event) => {
            // @ts-ignore
            const value = $event.target.value;
            const sub = timer(10).subscribe(() => {
              sub.unsubscribe();
              this.output.emit(value);
              this.proxySettings.output = value;
            });
          });
        }
      }
    });
  }

  async start(audioCtx: AudioContext, settings: WaveshaperSettings | null): Promise<void> {
    if(!this.nodesCreated) {
      this._ws = audioCtx.createWaveShaper();
      this._wsInput = audioCtx.createGain();
      this._wsOutput = audioCtx.createGain();
      this._wetGain  = audioCtx.createGain();
      this._dryGain = audioCtx.createGain();


      this._wsInput.connect(this._ws);
      this._wsInput.connect(this._dryGain);
      this._ws.connect(this._wsOutput);
      this._wsOutput.connect(this._wetGain)

      this.nodesCreated = true;
    }
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
    SetRadioButtons.set(this.outputTo(), this.proxySettings.output);
    SetRadioButtons.set(this.mode(), this.proxySettings.mode);

    this._setCurve(settings.mode);
    if(settings.drive === 0)
      this._wsOutput.gain.value = 0;
    else {
      this._wsInput.gain.value = settings.drive;
      this._wsOutput.gain.value = Math.pow(1.0 / settings.drive, 0.6);
    }
  }


  _setCurve(mode: string) {
    let n = 65536;
    let curve = new Float32Array(n);
    let amt = Math.min(this.amount, 0.9999);
    let k = 2 * amt / (1 - amt);



    const x = (i: number) => {return (i - (n / 2)) / (n / 2);}
    const x2 = (i: number) => {return Math.abs(x(i)) * 2}
    let curveFn: (i:number)=> number = x;

    switch (mode) {
      case 'identity':
        curveFn = x;
        break;
      case 'softClip':
        curveFn = (index: number) => {return Math.tanh(x(index))};
        break;
      case 'hardClip':
        curveFn = (index:number) => {return  0.5 * (Math.abs(x(index) + 0.63) - Math.abs(x(index) - 0.63))};
        break;
      case 'softClip2':
        curveFn = (index: number) => {return Math.tanh(x2(index))};
        break;
      case 'hardClip2':
        curveFn = (index:number) => {return  0.5 * (Math.abs(x2(index) + 0.63) - Math.abs(x2(index) - 0.63))};
        break;
      case 'softCubic':
        curveFn = (index:number) => {return  x(index) - Math.pow(x(index), 3) / 4};
        break;
    }


    for (let i = 0; i < n; i++) {
      curve[i] = curveFn(i);
     }

    this._ws.curve = curve;
    this._ws.oversample = '4x';
  }

  protected readonly dialStyle = dialStyle;

  public getSettings(): WaveshaperSettings {
    return this.proxySettings;
  }

  protected setDrive(drive: number) {
    this.proxySettings.drive = drive;

      this._wsInput.gain.value = this.proxySettings.drive+0.5;
      this._wsOutput.gain.value = Math.pow(1.0 / (this.proxySettings.drive+0.5), 0.6);

  }

  protected setWetDryBalance($event: number) {
    this.proxySettings.wetDry = $event;
    this._wetGain.gain.value = 0.5 - $event
    this._dryGain.gain.value = 0.5 + $event;
  }

  protected setMode(mode: string) {
    this.proxySettings.mode = mode;
    this._setCurve(mode);
  }

  protected setOutput(output: string) {
    this.proxySettings.output = output;
  }

  connect(node: AudioNode) {
    this._wetGain.connect(node);
    this._dryGain.connect(node);
    //this._wsOutput.connect(node);
  }

  disconnect(): void;
  disconnect(node: AudioNode | void): void {
    if (node) {
      //this._wsOutput.disconnect(node);
      this._dryGain.disconnect(node);
      this._wetGain.disconnect(node);
    }
    else {
      this._dryGain.disconnect();
      this._wetGain.disconnect();
      //this._wsOutput.disconnect();
    }
  }

  get node() {
    return this._wsInput;
  }
}
