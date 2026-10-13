import {Component, effect, input, signal, Signal} from '@angular/core';
import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {Subscription, timer} from 'rxjs';

@Component({
  selector: 'app-envelope-graph-component',
  styleUrl: './envelope-graph-component.scss',
  templateUrl: './envelope-graph-component.html',
})
export class EnvelopeGraphComponent {
  envelope = input.required<Signal<ADSRValues>>();
  pitchEnvelope = input.required<FreqBendValues>();
  enabled = input.required<boolean>();
  graphicsEnabled: boolean = false;

  protected showGraph = signal<boolean | null>(null);

  sub!: Subscription;


  constructor() {
    effect(() => {
      this.graphicsEnabled = this.enabled();
    })

    effect(() => {
      const adsr = this.envelope()();

      if(this.graphicsEnabled) {
        this.showGraph.set(true);
        if (this.sub)
          this.sub.unsubscribe();

        this.sub = timer(3000).subscribe(() => {
          this.sub.unsubscribe();
          this.showGraph.set(false);
        });
      }
    //  console.log(adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime);
    })
  }
}
