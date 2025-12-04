import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {dialStyle} from '../level-control/levelControlParameters';
import {LevelControlComponent} from '../level-control/level-control.component';
import {Filter} from '../modules/filter';
import {ADSRValues} from '../util-classes/adsrvalues';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {Oscillator} from '../modules/oscillator';
import {modulationType} from '../modules/gain-envelope-base';

@Component({
  selector: 'app-filters',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './filter-component.html',
  styleUrl: './filter-component.scss',
})
export class FilterComponent implements AfterViewInit {
  private _filters: Filter[] = [];
  private adsr!: ADSRValues;
  private freqBend!: FreqBendValues;
  protected tuningDivisions = 6;
  private lfo!: Oscillator;
  private audioCtx!: AudioContext;

  private set filters(filters: Filter[]) {
    this._filters = filters;
  }

  public get filters(): Filter[] {
    return this._filters;
  }

  @Input() numberOfFilters!: number;
  @Output() output = new EventEmitter<string>();
  @ViewChild('frequency') frequency!: LevelControlComponent;
  @ViewChild('gain') gain!: LevelControlComponent;
  @ViewChild('qfactor') qfactor!: LevelControlComponent;

  @ViewChild('freqAttack') freqAttack!: LevelControlComponent;
  @ViewChild('freqAttackLevel') freqAttackLevel!: LevelControlComponent;
  @ViewChild('freqDecay') freqDecay!: LevelControlComponent;
  @ViewChild('freqSustain') freqSustain!: LevelControlComponent;
  @ViewChild('freqRelease') freqRelease!: LevelControlComponent;
  @ViewChild('freqReleaseLevel') freqReleaseLevel!: LevelControlComponent;

  @ViewChild('filterOutputToForm') filterOutputTo!: ElementRef<HTMLFormElement>;

  @ViewChild('freqEnveOnOffForm') freqEnveOnOff!: ElementRef<HTMLFormElement>;
  @ViewChild('filterTypeForm') filterType!: ElementRef<HTMLFormElement>;

  @ViewChild('modSettingsForm') modSettingsForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modFreq') modFreq!: LevelControlComponent;
  @ViewChild('modDepth') modLevel!: LevelControlComponent;
  @ViewChild('lfoWaveForm') lfoWaveForm!: ElementRef<HTMLFormElement>;

  start(audioCtx: AudioContext): boolean {
    this.audioCtx = audioCtx;
    let ok = false;
    if (this.numberOfFilters) {
      this.lfo = new Oscillator(this.audioCtx);

      ok = true;
      this.adsr = new ADSRValues(0.2, 0.5, 1, 4);
      this.freqBend = new FreqBendValues(0, 1.5, .2, 1.5, 0.2, 0.0);

      for (let i = 0; i < this.numberOfFilters; ++i) {
        this.filters.push(new Filter(this.audioCtx));
        this.filters[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
        this.filters[i].setAmplitudeEnvelope(this.adsr)
        this.filters[i].useAmplitudeEnvelope = false;
        this.filters[i].setGain(.1);
        this.filters[i].setFreqBendEnvelope(this.freqBend);
        this.filters[i].useFreqBendEnvelope(false);
        this.filters[i].setType('lowpass');
        //
        // this.filters[i].modulation(this.lfo.oscillator, modulationType.frequency);
        //      //  this.filters[i].modulationOff();
        //      this.filters[i].setModLevel(23.4);
        //
      }

      this.frequency.setValue(0);  // Set frequency dial initial value.
      this.gain.setValue(4);
      this.qfactor.setValue(10);

      // Set up default frequency bend e=velope values
      this.freqAttack.setValue(this.freqBend.attackTime);
      this.freqAttackLevel.setValue(this.freqBend.attackLevel);
      this.freqDecay.setValue(this.freqBend.decayTime);
      this.freqSustain.setValue(this.freqBend.sustainLevel);
      this.freqRelease.setValue(this.freqBend.releaseTime);
      this.freqReleaseLevel.setValue(this.freqBend.releaseLevel);

      // Set up LFO default values
      this.modFreq.setValue(4);  // Set dial
      this.lfo.setFrequency(4 * 2);   // Set actual mod frequency
      this.modLevel.setValue(0);  // Set dial
      this.setModLevel(0); // Set actual mod depth
    }
    return ok;
  }

  protected setFrequency(freq: number) {
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setFrequency(450 * Math.pow(Math.pow(2, 1 / 12), (i + 1) + 120 * freq * this.tuningDivisions / 10));
    }
  }

  protected setGain(gain: number) {
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setGain(gain);
    }
  }

  protected setQFactor(qfactor: number) {
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setQ(qfactor * 100);
    }
  }

  useAmplitudeEnvelope(useAmplitudeEnvelope: boolean) {
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].useAmplitudeEnvelope = useAmplitudeEnvelope;
    }
  }

  useFreqBendEnvelope(useFreqBendEnvelope: boolean) {
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].useFreqBendEnvelope(useFreqBendEnvelope);
    }
  }

  private setFilterType(value: BiquadFilterType) {
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].setType(value);
    }
  }

  modulation(source: AudioNode) {
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].modulation(source);
    }
  }

  modulationOff() {
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].modulationOff();
    }
  }

  /**
   * connectToFilters: Connect to a group of filters
   * @param filters
   */
  connectToFilters(filters: Filter[]): boolean {
    let ok = false;
    if (filters && filters.length === this.filters.length) {
      ok = true;
      for (let i = 0; i < this.filters.length; i++) {
        this.filters[i].connect(filters[i].filter);
      }
    } else
      console.log("Filter array is a different size to the oscillator array")
    return ok;
  }

  /**
   * connect: Connect all filters in this group to a single node (i.e. gain node).
   * @param node
   */
  connect(node: AudioNode) {
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].connect(node);
    }
  }

  disconnect() {
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].disconnect();
    }
  }

  keyDown(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfFilters) {
      this.filters[keyIndex].keyDown();
    }
  }

  keyUp(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfFilters) {
      this.filters[keyIndex].keyUp();
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
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].setModLevel($event);
    }
  }

  protected setModType(type: modulationType) {
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].modulation(this.lfo.oscillator, type);
    }
  }

  ngAfterViewInit(): void {
    const oscOutForm = this.filterOutputTo.nativeElement;
    for (let i = 0; i < oscOutForm.elements.length; ++i) {
      oscOutForm.elements[i].addEventListener('change', ($event) => {
        const target = $event.target;
        // @ts-ignore
        this.output.emit(target.value);
      });
    }
    const freqEnveOnOffForm = this.freqEnveOnOff.nativeElement;
    for (let i = 0; i < freqEnveOnOffForm.elements.length; ++i) {
      freqEnveOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.useFreqBendEnvelope(value === 'on')
      })
    }
    const waveform = this.filterType.nativeElement;
    for (let i = 0; i < waveform.elements.length; ++i) {
      waveform.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as OscillatorType;
        this.setFilterType(value as BiquadFilterType);
      });

      const modSettingsForm = this.modSettingsForm.nativeElement;
      for (let j = 0; j < modSettingsForm.elements.length; ++j) {
        modSettingsForm.elements[j].addEventListener('change', ($event) => {
          // @ts-ignore
          const value = $event.target.value as modulationType;
          this.setModType(value);
        });
      }

      const modWaveForm = this.lfoWaveForm.nativeElement;
      for (let j = 0; j < modWaveForm.elements.length; ++j) {
        modWaveForm.elements[j].addEventListener('change', ($event) => {
          // @ts-ignore
          const value = $event.target.value as OscillatorType;
          this.lfo.setType(value);
        })
      }
    }
  }

}
