import {Component, effect, ElementRef, input, signal, Signal, untracked, viewChild} from '@angular/core';
import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {Subscription, timer} from 'rxjs';

@Component({
  selector: 'app-envelope-graph-component',
  styleUrl: './envelope-graph-component.scss',
  templateUrl: './envelope-graph-component.html',
})
export class EnvelopeGraphComponent {
  readonly canvasWidth: number = 500;
  readonly canvasHeight: number = 225;
  readonly fullScaleTime: number = 35;
  envelope = input.required<Signal<ADSRValues>>();
  pitchEnvelope = input.required<FreqBendValues>();
  enabled = input.required<boolean>();
  canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  adsrGraph = viewChild<ElementRef<HTMLDivElement>>('adsrGraph');
  graphicsEnabled: boolean = false;

  private adsr!: ADSRValues;

  protected showGraph = signal<boolean | null>(null);

  sub!: Subscription;


  constructor() {
    effect(() => {
      this.graphicsEnabled = this.enabled();
    })

    effect(() => {
      if(this.adsrGraph) {
        const adsrGraph = this.adsrGraph()?.nativeElement;
        if(adsrGraph) {
          adsrGraph.style.top = '-550px';
          adsrGraph.style.left = '130px';
        }
      }
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
      requestAnimationFrame(this.draw);
    });
  }

  draw = () => {
    const canvas = untracked(() => this.canvas());
    const ctx = canvas?.nativeElement.getContext('2d');
    if (ctx) {
      this.drawGraph(this.adsr, ctx);
    }
  }

  private readonly xScale = this.canvasWidth / this.fullScaleTime;
  private readonly yScale = -this.canvasHeight+4;
  private readonly yOffset = this.canvasHeight;
  private readonly lowestV = 0.01;
  envelopeRamp(numPoints: number, v0:number, v1:number, t0:number, t1: number, ctx:CanvasRenderingContext2D) {
    if((t1 - t0) === 0) {
     // ctx.lineTo(v0, t0);
      ctx.lineTo(this.xScale * t1, this.yScale * v1 + this.yOffset);
    } else {
      if(v1 < this.lowestV)
         v1 = this.lowestV;
      if(v0 < this.lowestV)
        v0 = this.lowestV;

      const inc = (t1 -t0) / numPoints;
      let t = t0;
      while(t < t1) {
        ctx.lineTo(t * this.xScale, this.yScale * v0 * Math.pow(v1/v0, (t-t0)/(t1-t0)) +this.yOffset);
        t += inc;
      }
      ctx.lineTo(this.xScale * t1, this.yScale * v1 + this.yOffset);
    }
  }

  drawGraph(adsr: ADSRValues, ctx: CanvasRenderingContext2D) {
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
    ctx.moveTo(0, this.yOffset);
    this.envelopeRamp(numberOfPoints, 0, 1, 0, attackTime, ctx);
    this.envelopeRamp(numberOfPoints, 1, sustainLevel, attackTime, attackTime + adsr.decayTime, ctx);
    ctx.lineTo(this.xScale * (attackTime + adsr.decayTime + sustainSpan), this.yScale * sustainLevel + this.yOffset);
    this.envelopeRamp(numberOfPoints, sustainLevel, 0, attackTime + adsr.decayTime +sustainSpan, attackTime + adsr.decayTime +sustainSpan+adsr.releaseTime, ctx);
    ctx.stroke();
    ctx.closePath();
  }
}
