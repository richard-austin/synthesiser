import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, ViewChild} from '@angular/core';
import {analyserTypes} from '../enums/enums';
import {AnalyserSettings} from '../settings/analyser-settings';
import {Cookies} from '../settings/cookies/cookies';
import {SetRadioButtons} from '../settings/set-radio-buttons';

@Component({
  selector: 'app-analyser',
  imports: [],
  templateUrl: './analyser-component.html',
  styleUrl: './analyser-component.scss',
})
export class AnalyserComponent implements AfterViewInit {
  private audioCtx!: AudioContext;
  private analyser!: AnalyserNode;
  private data!: Uint8Array<ArrayBuffer>;
  private canvasCtx!: CanvasRenderingContext2D | null;
  private canvasEL!: HTMLCanvasElement;
  private cookies: Cookies;
  private proxySettings!: AnalyserSettings;

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('analyserTypeForm') analyserTypeForm!: ElementRef<HTMLFormElement>;

  constructor(private cd: ChangeDetectorRef) {
    this.cookies = new Cookies();
  }

  async start(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.applySettings();
  }

  applySettings(settings: AnalyserSettings = new AnalyserSettings()) {
    const cookieName = 'analyser';

    const savedSettings = this.cookies.getSettings(cookieName);

    if (Object.keys(savedSettings).length > 0) {
      // Use values from cookie
      settings = savedSettings as AnalyserSettings;
    }
    // else use default settings

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);
    SetRadioButtons.set(this.analyserTypeForm, this.proxySettings.analyserType);
  }

  private draw = () => {
    if (this.proxySettings.analyserType === analyserTypes.off) return
    this.canvasEL = this.canvas.nativeElement;
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
      ctx.lineTo(x, height - freqData[x] * scaling);

    ctx.stroke();
  }


  drawScope(analyser: AnalyserNode, ctx: CanvasRenderingContext2D) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const timeData = new Uint8Array(analyser.frequencyBinCount);
    const scaling = height / 256;
    let risingEdge = 0;
    const edgeThreshold = 5;

    analyser.getByteTimeDomainData(timeData);

    ctx.fillStyle = 'rgba(0, 20, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 200, 0)';
    ctx.beginPath();

    // No buffer overrun protection
    while (timeData[risingEdge++] - 128 > 0 && risingEdge <= width) {
    }
    if (risingEdge >= width) risingEdge = 0;

    while (timeData[risingEdge++] - 128 < edgeThreshold && risingEdge <= width) {
    }
    if (risingEdge >= width) risingEdge = 0;

    for (let x = risingEdge; x < timeData.length && x - risingEdge < width; x++)
      ctx.lineTo(x - risingEdge, height - timeData[x] * scaling);

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
    const analyserTypeForm = this.analyserTypeForm.nativeElement;
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

}
