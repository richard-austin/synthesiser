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
  readonly canvasHeight: number = 350;
  readonly fullScaleTime: number = 27;
  envelope = input.required<Signal<ADSRValues>>();
  pitchEnvelope = input.required<FreqBendValues>();
  enabled = input.required<boolean>();
  canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  graphicsEnabled: boolean = false;

  private adsr!: ADSRValues;

  protected showGraph = signal<boolean | null>(null);

  sub!: Subscription;


  constructor() {
    effect(() => {
      this.graphicsEnabled = this.enabled();
    })

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
       //  console.log(adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime);
    })
  }

  draw = () => {
    const canvas = untracked(() => this.canvas());
    const ctx = canvas?.nativeElement.getContext('2d');
    if (ctx) {
      this.drawGraph(this.adsr, ctx);
    }
    requestAnimationFrame(this.draw)
  }

  drawGraph(adsr: ADSRValues, ctx: CanvasRenderingContext2D) {
    const sustainSpan = this.fullScaleTime - adsr.attackTime - adsr.decayTime - adsr.releaseTime;
    const xScale = this.canvasWidth / this.fullScaleTime;
    const yScale = this.canvasHeight;

    ctx.rect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.fillStyle = 'rgba(0, 20, 0, 0.1)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 200, 0)';
    ctx.beginPath();
    ctx.moveTo(0, this.canvasHeight);
    ctx.lineTo(adsr.attackTime * xScale, 0);
    ctx.lineTo(xScale * (adsr.attackTime + adsr.decayTime), yScale * (1-adsr.sustainLevel));
    ctx.lineTo(xScale * (adsr.attackTime + adsr.decayTime + sustainSpan), yScale * (1 -adsr.sustainLevel));
    ctx.lineTo(xScale * this.fullScaleTime, this.canvasHeight);
    ctx.stroke();
    ctx.closePath();
  }
}
