import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {Oscillator} from '../modules/oscillator';
import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {LevelControlComponent} from '../level-control/level-control.component';
import {modulationType} from '../modules/gain-envelope-base';
import {Filter} from '../modules/filter';
import {dialStyle} from '../level-control/levelControlParameters';

@Component({
  selector: 'app-oscillators',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './oscillator.component.html',
  styleUrl: './oscillator.component.scss',
})
export class OscillatorComponent implements AfterViewInit {
  private oscillators: Oscillator[] = [];
  private adsr!: ADSRValues;
  private freqBend!: FreqBendValues;
  protected tuningDivisions = 6;
  private lfo!: Oscillator;

  @Input() audioCtx!: AudioContext;
  @Input() numberOfOscillators!: number;
  @Output() output = new EventEmitter<string>();
  @ViewChild('frequency') frequency!: LevelControlComponent;
  @ViewChild('gain') gain!: LevelControlComponent;
  @ViewChild('attack') attack!: LevelControlComponent;
  @ViewChild('decay') decay!: LevelControlComponent;
  @ViewChild('sustain') sustain!: LevelControlComponent;
  @ViewChild('release') release!: LevelControlComponent;

  @ViewChild('freqAttack') freqAttack!: LevelControlComponent;
  @ViewChild('freqAttackLevel') freqAttackLevel!: LevelControlComponent;
  @ViewChild('freqDecay') freqDecay!: LevelControlComponent;
  @ViewChild('freqSustain') freqSustain!: LevelControlComponent;
  @ViewChild('freqRelease') freqRelease!: LevelControlComponent;
  @ViewChild('freqReleaseLevel') freqReleaseLevel!: LevelControlComponent;

  @ViewChild('oscOutputToForm') oscOutputToForm!: ElementRef<HTMLFormElement>;

  @ViewChild('freqEnveOnOffForm') freqEnveOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('amplitudeEnvelopeOnOffForm') amplitudeEnvelopeOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('oscWaveForm') oscWaveForm!: ElementRef<HTMLFormElement>;

  @ViewChild('modSettingsForm') modSettingsForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modFreq') modFreq!: LevelControlComponent;
  @ViewChild('modDepth') modLevel!: LevelControlComponent;

  start(): boolean {
    let ok = false;
    if (this.numberOfOscillators) {
      this.lfo = new Oscillator(this.audioCtx);

      ok = true;
      this.adsr = new ADSRValues(0.2, 0.5, 1, 4);
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
     //
     // this.oscillators[i].modulation(this.lfo.oscillator, modulationType.frequency);
     //      //  this.oscillators[i].modulationOff();
     //      this.oscillators[i].setModLevel(23.4);
     //
      }

      this.frequency.setValue(0);  // Set frequency dial initial value.
      this.gain.setValue(4);
      this.attack.setValue(this.adsr.attackTime);
      this.decay.setValue(this.adsr.decayTime);
      this.sustain.setValue(this.adsr.sustainLevel);
      this.release.setValue(this.adsr.releaseTime);

      // Set up default frequency bend e=velope values
      this.freqAttack.setValue(this.freqBend.attackTime);
      this.freqAttackLevel.setValue(this.freqBend.attackLevel);
      this.freqDecay.setValue(this.freqBend.decayTime);
      this.freqSustain.setValue(this.freqBend.sustainLevel);
      this.freqRelease.setValue(this.freqBend.releaseTime);
      this.freqReleaseLevel.setValue(this.freqBend.releaseLevel);

      // Set up LFO default values
      // this.lfo = new LFO(this.audioCtx);
      // this.lfo.lfo.frequency.setValueAtTime(4, this.audioCtx.currentTime);
      this.modFreq.setValue(4);  // Set dial
      this.lfo.setFrequency(4);   // Set actual mod frequency
      this.modLevel.setValue(0);  // Set dial
      this.setModLevel(0); // Set actual mod depth
      this.modulation(this.lfo.oscillator, modulationType.off);
    }
    return ok;
  }

  protected setFrequency(freq: number) {
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].setFrequency(450 * Math.pow(Math.pow(2, 1 / 12), (i + 1) + 120 * freq * this.tuningDivisions / 10));
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

  useFreqBendEnvelope(useFreqBendEnvelope: boolean) {
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].useFreqBendEnvelope(useFreqBendEnvelope);
    }
  }

  private setWaveForm(value: OscillatorType) {
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].setType(value);
    }
  }

  modulation(source: AudioNode, type: modulationType) {
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].modulation(source, type);
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
    if (filters && filters.length === this.oscillators.length) {
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

  keyDown(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfOscillators) {
      this.oscillators[keyIndex].keyDown();
    }
  }

  keyUp(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfOscillators) {
      this.oscillators[keyIndex].keyUp();
    }
  }

  protected setAttack($event: number) {
    this.adsr.attackTime = $event;
  }

  protected setDecayTime($event: number) {
    this.adsr.decayTime = $event * 10;
  }

  protected setSustainLevel($event: number) {
    this.adsr.sustainLevel = $event;
  }

  protected setReleaseTime($event: number) {
    this.adsr.releaseTime = $event * 10;
  }

  protected readonly dialStyle = dialStyle;

  protected setFreqAttack($event: number) {
    this.freqBend.attackTime = $event * 3;
  }

  protected setFreqAttackLevel($event: number) {
    this.freqBend.attackLevel = $event * 5;
  }

  protected setFreqDecayTime($event: number) {
    this.freqBend.decayTime = $event * 3;
  }

  protected setFreqSustainLevel($event: number) {
    this.freqBend.sustainLevel = $event * 5;
  }

  protected setFreqReleaseTime($event: number) {
    this.freqBend.releaseTime = $event * 3;
  }

  protected setFreqReleaseLevel($event: number) {
    this.freqBend.releaseLevel = $event * 5;
  }

  protected setModFrequency(freq: number) {
    this.lfo.setFrequency(freq * 20);
  }

  protected setModLevel($event: number) {
    for(let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].setModLevel($event);
    }
  }

  protected setModType(type: modulationType) {
    for(let i = 0; i < this.numberOfOscillators; ++i) {
      if (type === modulationType.off) {
        this.oscillators[i].modulationOff();
      }
      else {
        this.oscillators[i].modulation(this.lfo.oscillator, type);
      }
    }
  }

  ngAfterViewInit(): void {
    const oscOutForm = this.oscOutputToForm.nativeElement;
    for (let i = 0; i < oscOutForm.elements.length; ++i) {
      oscOutForm.elements[i].addEventListener('change', ($event) => {
        const target = $event.target;
        // @ts-ignore
        this.output.emit(target.value);
      });
    }
    const freqEnveOnOffForm = this.freqEnveOnOffForm.nativeElement;
    for (let i = 0; i < freqEnveOnOffForm.elements.length; ++i) {
      freqEnveOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.useFreqBendEnvelope(value === 'on')
      })
    }
    const amplitudeEnvelopeOnOffForm = this.amplitudeEnvelopeOnOffForm.nativeElement;
    for (let i = 0; i < amplitudeEnvelopeOnOffForm.elements.length; ++i) {
      amplitudeEnvelopeOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.useAmplitudeEnvelope(value === 'on');
      });
    }
    const waveform = this.oscWaveForm.nativeElement;
    for (let i = 0; i < waveform.elements.length; ++i) {
      waveform.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as OscillatorType;
        this.setWaveForm(value as OscillatorType);
      });

      const modSettingsForm = this.modSettingsForm.nativeElement;
      for (let j = 0; j < modSettingsForm.elements.length; ++j) {
        modSettingsForm.elements[j].addEventListener('change', ($event) => {
          // @ts-ignore
          const value = $event.target.value as modulationType;
          this.setModType(value);
        });
      }
    }
  }
}
