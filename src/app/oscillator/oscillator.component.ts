import {Component, Input} from '@angular/core';
import {Oscillator} from '../modules/oscillator';
import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {LevelControlComponent} from '../level-control/level-control.component';
import {modulationType} from '../modules/gain-envelope-base';
import {Filter} from '../modules/filter';

@Component({
  selector: 'app-oscillator-module',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './oscillator.component.html',
  styleUrl: './oscillator.component.scss',
})
export class OscillatorComponent {
  private oscillators: Oscillator[] = [];
  private adsr!: ADSRValues;
  private freqBend!: FreqBendValues;

  @Input() audioCtx!: AudioContext;
  @Input() numberOfOscillators!: number;

  start(): boolean {
    let ok = false;
    if(this.numberOfOscillators) {
      ok = true;
      this.adsr = new ADSRValues(0.03, 0.5, 1, 4);
      this.freqBend = new FreqBendValues(0, 1.5, .2, 1.5, 0.2, 0.0);

      for (let i = 0; i < this.numberOfOscillators; ++i) {
        this.oscillators.push(new Oscillator(this.audioCtx));
        this.oscillators[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
        this.oscillators[i].setAmplitudeEnvelope(this.adsr)
        this.oscillators[i].useAmplitudeEnvelope = true;
        this.oscillators[i].setGain(.1);
        this.oscillators[i].setFreqBendEnvelope(this.freqBend);
        this.oscillators[i].useFreqBendEnvelope(false);
        this.oscillators[i].setType('sine');
      }
    }
    return ok;
  }

  protected setFrequency(freq: number) {
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1) + 120 * freq));
    }
  }

  protected setGain(gain: number) {
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].setGain(gain);
    }
  }

  useAmplitudeEnvelope(useAmplitudeEnvelope: boolean) {
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].useAmplitudeEnvelope = useAmplitudeEnvelope;
    }
  }

  useFreqBendEnvelopeOff(useFreqBendEnvelope: boolean) {
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].useFreqBendEnvelope(useFreqBendEnvelope);
    }
  }

  setType(type: OscillatorType) {
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].setType(type);
    }
  }

  modulation(source: AudioNode, type: modulationType) {
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].modulation(source, type);
    }
  }

  setModLevel(level: number) {
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].setModLevel(level);
    }
  }
  modulationOff() {
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].modulationOff();
    }
  }

  /**
   * connectToFilters: Connect to a group of filters
   * @param filters
   */
  connectToFilters(filters: Filter[]): boolean {
    let ok = false;
    if(filters && filters.length === this.oscillators.length) {
      ok = true;
      for (let i = 0; i < this.oscillators.length; i++) {
        this.oscillators[i].connect(filters[i].filter);
      }
    } else
      console.log("Filter array is a different size to the oscillator array")
    return ok;
  }

  /**
   * connect: Connect all oscillators in this group to a single node (i.e. gain node).
   * @param node
   */
  connect(node: AudioNode) {
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].connect(node);
    }
  }

  disconnect() {
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].disconnect();
    }
  }

  keyDown() {
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].keyDown();
    }
  }

  keyUp() {
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].keyUp();
    }
  }
}
