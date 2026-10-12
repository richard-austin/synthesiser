import {Component, effect, input, KeyValueDiffer, KeyValueDiffers, Signal} from '@angular/core';
import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';

@Component({
  imports: [],
  selector: 'app-envelope-graph-component',
  styleUrl: './envelope-graph-component.scss',
  templateUrl: './envelope-graph-component.html',
})
export class EnvelopeGraphComponent {
  envelope = input.required<Signal<ADSRValues>>();
  pitchEnvelope = input.required<FreqBendValues>();

  constructor() {
    effect(() => {
      const adsr = this.envelope()();

      console.log(adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime);
    })
  }
}
