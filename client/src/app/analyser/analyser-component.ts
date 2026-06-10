import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, Signal, viewChild, ViewChild} from '@angular/core';
import {analyserTypes} from '../enums/enums';
import {AnalyserSettings} from '../settings/analyser-settings';
import {Cookies} from '../settings/cookies/cookies';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';

@Component({
  selector: 'app-analyser',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './analyser-component.html',
  styleUrl: './analyser-component.scss',
})
export class AnalyserComponent implements AfterViewInit {
  private audioCtx!: AudioContext;
  private analyser!: AnalyserNode;
  private canvasCtx!: CanvasRenderingContext2D | null;
  private canvasEL!: HTMLCanvasElement;
  private cookies: Cookies;
  protected proxySettings!: AnalyserSettings;

  private triggerEdge = "rising";
  private triggerLevel = 3;
  private yScale = 1;
  private xScale = 1;

  canvas: Signal<ElementRef<HTMLCanvasElement>> = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  analyserTypeForm: Signal<ElementRef<HTMLFormElement>> = viewChild.required<ElementRef<HTMLFormElement>>('analyserTypeForm');
  yScaleControl = viewChild.required<LevelControlComponent>('yScale');
  xScaleControl = viewChild.required<LevelControlComponent>('xScale');
  triggerLevelControl = viewChild.required<LevelControlComponent>('trigLevel');

  constructor(private cd: ChangeDetectorRef) {
    this.cookies = new Cookies();
  }

  async start(audioCtx: AudioContext, settings: AnalyserSettings | null): Promise<void> {
    this.audioCtx = audioCtx;
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.applySettings(settings);
  }

  applySettings(settings: AnalyserSettings | null) {
    const cookieName = 'analyser';

    if(!settings) {
      settings = new AnalyserSettings();
      const savedSettings = this.cookies.getSettings(cookieName, settings);

      if (Object.keys(savedSettings).length > 0) {
        // Use values from cookie
        settings = savedSettings as AnalyserSettings;
      }
      // else use default settings
    }

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);
    this.yScaleControl().setValue(this.proxySettings.yScale ? this.proxySettings.yScale : 1);
    this.xScaleControl().setValue(this.proxySettings?.xScale ? this.proxySettings.xScale : 1);
    this.triggerLevelControl().setValue(this.proxySettings?.triggerLevel ? this.proxySettings.triggerLevel : 0);
    SetRadioButtons.set(this.analyserTypeForm(), this.proxySettings.analyserType);
  }

  getSettings(): AnalyserSettings {
    return this.proxySettings;
  }

  private draw = () => {
    if (this.proxySettings.analyserType === analyserTypes.off) return
    this.canvasEL = this.canvas().nativeElement;
    this.canvasCtx = this.canvasEL.getContext("2d");
    if (this.canvasCtx) {
      if (this.proxySettings.analyserType === analyserTypes.spectrum)
        this.drawSpectrum(this.analyser, this.canvasCtx);
      else {
        if (this.proxySettings.analyserType === analyserTypes.oscilloscope)
          this.drawScope(this.analyser, this.canvasCtx);
      }
    }

    // make a loop to continue drawing on the next frame
    requestAnimationFrame(this.draw)
  }

  drawSpectrum(analyser: AnalyserNode, ctx: CanvasRenderingContext2D) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const scaling = height / 256;

    analyser.getByteFrequencyData(freqData);

    ctx.fillStyle = 'rgba(0, 20, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 200, 0)';
    ctx.beginPath();

    for (let x = 0; x < width; x++)
      ctx.lineTo(x *1.5, height - freqData[x] * scaling);

    ctx.stroke();
  }

  /**
   * Scans buffer array indices to find threshold intersection.
   */
  private calculateTriggerIndex(timeData: Uint8Array): number {

    const searchLimit = timeData.length / 2;

    for (let i = 1; i < searchLimit; i++) {
      const previousSample = timeData[i - 1]-128;
      const currentSample = timeData[i]-128;

      if (this.triggerEdge === 'rising') {
        if (previousSample <= this.triggerLevel && currentSample > this.triggerLevel) {
          return i;
        }
      } else {
        if (previousSample >= this.triggerLevel && currentSample < this.triggerLevel) {
          return i;
        }
      }
    }
    return 0; // Baseline fallback if no edge match occurs
  }

  drawScope(analyser: AnalyserNode, ctx: CanvasRenderingContext2D) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const timeData = new Uint8Array(analyser.frequencyBinCount);

    analyser.getByteTimeDomainData(timeData);

    let minValue = timeData[0];
    let maxValue = timeData[0];
    timeData.forEach(d => {
      if(d < minValue)
        minValue = d;
      else if(d > maxValue)
        maxValue = d;
    });

    ctx.fillStyle = 'rgba(0, 20, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 200, 0)';
    ctx.beginPath();

    const offsetXScale = this.xScale +0.7;
    const triggerIndex = this.calculateTriggerIndex(timeData);
    //console.log("triggerIndex = ", triggerIndex);
    for (let x = triggerIndex; x < timeData.length && (x - triggerIndex)*offsetXScale < width; x++)
      ctx.lineTo((x - triggerIndex)*offsetXScale, (128 - timeData[x])*this.yScale + height/2);

    ctx.stroke();
  }


  private setAnalyserType(value: analyserTypes) {
    this.proxySettings.analyserType = value;
    if (value !== analyserTypes.off)
      this.draw();
  }

  protected getAnalyserType(): string {
    return this.proxySettings?.analyserType === analyserTypes.spectrum ? "Spectrum" :
      this.proxySettings?.analyserType === analyserTypes.oscilloscope ? "Oscilloscope" :
        "Off";
  }

  protected analyserUsed() {
    return this.proxySettings?.analyserType !== analyserTypes.off;
  }
  node(): AudioNode {
    return this.analyser;
  }

  async ngAfterViewInit(): Promise<void> {
    const analyserTypeForm = this.analyserTypeForm().nativeElement;
    for (let i = 0; i < analyserTypeForm.elements.length; ++i) {
      analyserTypeForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.setAnalyserType(value);
        this.cd.detectChanges();
      });
    }
  }

//  protected readonly analyserTypes = analyserTypes;
  protected readonly analyserTypes = analyserTypes;
  protected readonly dialStyle = dialStyle;

  protected setTrigLevel($event: number) {
    this.triggerLevel = $event;
    this.proxySettings.triggerLevel = $event;
  }

  protected setYScale($event: number) {
    this.yScale = $event;
    this.proxySettings.yScale = $event;
  }

  protected setXScale($event: number) {
    this.xScale = $event;
    this.proxySettings.xScale = $event;
  }
}
