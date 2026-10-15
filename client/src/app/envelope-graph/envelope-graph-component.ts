import {Component, effect, ElementRef, input, signal, Signal, untracked, viewChild} from '@angular/core';
import {ADSRValues} from '../util-classes/adsrvalues';
import {PitchEnvValues} from '../util-classes/pitch-env-values';
import {Subscription, timer} from 'rxjs';
import {EnvelopeGraphConstants} from '../util-classes/envelope-graph-constants';

@Component({
  selector: 'app-envelope-graph-component',
  styleUrl: './envelope-graph-component.scss',
  templateUrl: './envelope-graph-component.html',
})
export class EnvelopeGraphComponent {
  readonly canvasWidth: number = 500;
  readonly canvasHeight: number = 225;
  readonly fullScaleTime: number = 35;
  envelope = input.required<Signal<ADSRValues | PitchEnvValues>>();
  pitchEnvelope = input.required<PitchEnvValues>();
  enabled = input.required<boolean>();
  positionOffset = input.required<{ xOffset: number, yOffset: number }>();
  canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  adsrGraph = viewChild<ElementRef<HTMLDivElement>>('adsrGraph');
  graphicsEnabled: boolean = false;

  private adsr!: ADSRValues | PitchEnvValues;

  protected showGraph = signal<boolean | null>(null);

  sub!: Subscription;


  constructor() {
    effect(() => {
      this.graphicsEnabled = this.enabled();
    })

    let yOffset = -550;
    let xOffset = 130;

    effect(() => {
      const positionOffset = this.positionOffset();
      xOffset = positionOffset.xOffset;
      yOffset = positionOffset.yOffset;
    });

    effect(() => {
      this.adsr = this.envelope()();
      if (this.graphicsEnabled) {
        this.showGraph.set(true);
        if (this.sub)
          this.sub.unsubscribe();

        this.sub = timer(3000).subscribe(() => {
          this.sub.unsubscribe();
          this.showGraph.set(false);
        });
      }
      const adsrGraph = untracked(() => this.adsrGraph())?.nativeElement;

      if (adsrGraph) {
        adsrGraph.style.top = yOffset + 'px';
        adsrGraph.style.left = xOffset + 'px';
        requestAnimationFrame(this.draw);
      }
    });
  }

  draw = () => {
    const canvas = untracked(() => this.canvas());
    const ctx = canvas?.nativeElement.getContext('2d');
    if (ctx) {
      if (this.adsr instanceof ADSRValues)
        this.drawGraph(this.adsr, ctx);

      if (this.adsr instanceof PitchEnvValues)
        this.drawPitchEnvelopeGraph(this.adsr, ctx);
    }
  }

  private readonly envGraphConstants: EnvelopeGraphConstants = new EnvelopeGraphConstants(this.canvasWidth / this.fullScaleTime, 0, -this.canvasHeight + 4, this.canvasHeight);
  private readonly pitchEnvGraphConstants: EnvelopeGraphConstants = new EnvelopeGraphConstants(this.canvasWidth / this.fullScaleTime, 0, -this.canvasHeight + 4, this.canvasHeight);

  private readonly lowestV = 0.01;
  private readonly offsetForPitchEnvelope = 0.5;

  envelopeRamp(numPoints: number, v0: number, v1: number, t0: number, t1: number, gc: EnvelopeGraphConstants, ctx: CanvasRenderingContext2D) {
    const pitchEnv = this.adsr instanceof PitchEnvValues;
    if ((t1 - t0) === 0) {
      if (pitchEnv) {
        ctx.lineTo(gc.xScale * t0, gc.yScale * (v0 + this.offsetForPitchEnvelope) + gc.yOffset);
        ctx.lineTo(gc.xScale * t1, gc.yScale * (v1 + this.offsetForPitchEnvelope) + gc.yOffset);
      } else {
        ctx.lineTo(gc.xScale * t0, gc.yScale * v0 + gc.yOffset);
        ctx.lineTo(gc.xScale * t1, gc.yScale * v1 + gc.yOffset);
      }
    } else {
      if (pitchEnv) {
        v1 += this.offsetForPitchEnvelope;
        v0 += this.offsetForPitchEnvelope;
      }
      if (v1 == 0)
        v1 = this.lowestV;
      if (v0 == 0)
        v0 = this.lowestV;

      const inc = (t1 - t0) / numPoints;
      let t = t0;
      while (t < t1) {
        ctx.lineTo(t * gc.xScale, gc.yScale * v0 * Math.pow(v1 / v0, (t - t0) / (t1 - t0)) + gc.yOffset);
        t += inc;
      }
      ctx.lineTo(gc.xScale * t1, gc.yScale * v1 + gc.yOffset);
    }
  }

  drawGraph(adsr: ADSRValues, ctx: CanvasRenderingContext2D) {
    const gc = this.envGraphConstants;
    const numberOfPoints = 100;
    const attackTime = adsr.attackTime * 8;
    const sustainSpan = this.fullScaleTime - attackTime - adsr.decayTime - adsr.releaseTime;
    const sustainLevel = adsr.sustainLevel > this.lowestV ? adsr.sustainLevel : this.lowestV;
    // ctx.rect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.fillStyle = 'rgba(0, 20, 0)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 200, 0)';
    ctx.beginPath();
    ctx.moveTo(0, gc.yOffset);
    this.envelopeRamp(numberOfPoints, 0, 1, 0, attackTime, gc, ctx);
    this.envelopeRamp(numberOfPoints, 1, sustainLevel, attackTime, attackTime + adsr.decayTime, gc, ctx);
    ctx.lineTo(gc.xScale * (attackTime + adsr.decayTime + sustainSpan), gc.yScale * sustainLevel + gc.yOffset);
    this.envelopeRamp(numberOfPoints, sustainLevel, 0, attackTime + adsr.decayTime + sustainSpan, attackTime + adsr.decayTime + sustainSpan + adsr.releaseTime, gc, ctx);
    ctx.stroke();
    ctx.closePath();
  }

  drawPitchEnvelopeGraph(pitchEnv: PitchEnvValues, ctx: CanvasRenderingContext2D) {
    // console.log(pitchEnv.attackLevel, pitchEnv.attackTime, pitchEnv.decayTime, pitchEnv.sustainLevel, pitchEnv.releaseTime, pitchEnv.releaseLevel);
    const gc = this.pitchEnvGraphConstants;
    const numberOfPoints = 100;
    const attackTime = pitchEnv.attackTime * 8;
    const sustainSpan = this.fullScaleTime - attackTime - pitchEnv.decayTime - pitchEnv.releaseTime;
    const sustainLevel = pitchEnv.sustainLevel;
    // ctx.rect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.fillStyle = 'rgba(0, 20, 0)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 200, 0)';
    ctx.beginPath();
    ctx.moveTo(0, pitchEnv.releaseLevel * gc.yScale + gc.yOffset);
    this.envelopeRamp(numberOfPoints, pitchEnv.releaseLevel, pitchEnv.attackLevel, 0, attackTime, gc, ctx);
    this.envelopeRamp(numberOfPoints, pitchEnv.attackLevel, sustainLevel, attackTime, attackTime + pitchEnv.decayTime, gc, ctx);
    ctx.lineTo(gc.xScale * (attackTime + pitchEnv.decayTime + sustainSpan), gc.yScale * (sustainLevel + this.offsetForPitchEnvelope) + gc.yOffset);
    this.envelopeRamp(numberOfPoints, sustainLevel, pitchEnv.releaseLevel, attackTime + pitchEnv.decayTime + sustainSpan, attackTime + pitchEnv.decayTime + sustainSpan + pitchEnv.releaseTime, gc, ctx);
    ctx.stroke();
    ctx.closePath();
  }
}
