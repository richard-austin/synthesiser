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
    })
  }

  draw = () => {
    const canvas = untracked(() => this.canvas());
    const ctx = canvas?.nativeElement.getContext('2d');
    if (ctx) {
      this.drawGraph(this.adsr, ctx);
    }
  }

  drawGraph(adsr: ADSRValues, ctx: CanvasRenderingContext2D) {

    const xScale = this.canvasWidth / this.fullScaleTime;
    const yScale = this.canvasHeight;
    const attackTime = adsr.attackTime * 8;
    const sustainSpan = this.fullScaleTime - attackTime - adsr.decayTime - adsr.releaseTime;

    ctx.rect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.fillStyle = 'rgba(0, 20, 0, 0.1)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(0, 200, 0)';
    ctx.beginPath();
    ctx.moveTo(0, this.canvasHeight);
    ctx.lineTo(attackTime * xScale, 0);
    ctx.lineTo(xScale * (attackTime + adsr.decayTime), yScale * (1-adsr.sustainLevel));
    ctx.lineTo(xScale * (attackTime + adsr.decayTime + sustainSpan), yScale * (1 -adsr.sustainLevel));
    ctx.lineTo(xScale * this.fullScaleTime, yScale);
    ctx.stroke();
    ctx.closePath();
  }
}
