import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {dialStyle} from '../level-control/levelControlParameters';
import {LevelControlComponent} from '../level-control/level-control.component';
import {Filter} from '../modules/filter';
import {Oscillator} from '../modules/oscillator';
import {ReverbComponent} from '../reverb-component/reverb-component';
import {RingModulatorComponent} from '../ring-modulator/ring-modulator-component';
import {PhasorComponent} from '../phasor/phasor-component';
import {filterModType, filterTypes, modWaveforms, onOff} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {FilterSettings} from '../settings/filter';

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
  protected tuningDivisions = 6;
  private lfo!: Oscillator;
  private audioCtx!: AudioContext;
  settings!: FilterSettings

  public get filters(): Filter[] {
    return this._filters;
  }

  @Input() numberOfFilters!: number;
  @Input() reverb!: ReverbComponent;
  @Input() ringMod!: RingModulatorComponent;
  @Input() phasor!: PhasorComponent;

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

      this.applySettings();
    }
    return ok;
  }

  applySettings(settings: FilterSettings = new FilterSettings()) {
    this.settings = settings;
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters.push(new Filter(this.audioCtx));
      this.filters[i].setFrequency(this.settings.frequency * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
      this.filters[i].setFreqBendEnvelope(this.settings.freqBend);
      this.filters[i].useFreqBendEnvelope(this.settings.useFrequencyEnvelope === onOff.off);
      this.filters[i].setType(this.settings.filterType);
    }

    this.frequency.setValue(this.settings.frequency);  // Set frequency dial initial value.
    this.gain.setValue(this.settings.gain);
    this.qfactor.setValue(this.settings.qFactor);

    // Set up default frequency bend e=velope values
    this.freqAttack.setValue(this.settings.freqBend.attackTime);
    this.freqAttackLevel.setValue(this.settings.freqBend.attackLevel);
    this.freqDecay.setValue(this.settings.freqBend.decayTime);
    this.freqSustain.setValue(this.settings.freqBend.sustainLevel);
    this.freqSustain.setValue(this.settings.freqBend.sustainLevel);
    this.freqRelease.setValue(this.settings.freqBend.releaseTime);
    this.freqReleaseLevel.setValue(this.settings.freqBend.releaseLevel);

    // Set up LFO default values
    this.modFreq.setValue(this.settings.modFreq);  // Set dial
    this.modLevel.setValue(this.settings.modLevel);  // Set dial

    // Set up the buttons
    SetRadioButtons.set(this.filterOutputTo, this.settings.output);
    SetRadioButtons.set(this.filterType, this.settings.filterType);
    SetRadioButtons.set(this.freqEnveOnOff, this.settings.useFrequencyEnvelope);
    SetRadioButtons.set(this.modSettingsForm, this.settings.modType);
    SetRadioButtons.set(this.lfoWaveForm, this.settings.modWaveform);
  }


  protected setFrequency(freq: number) {
    this.settings.frequency = freq;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setFrequency(450 * Math.pow(Math.pow(2, 1 / 12), (i + 1) + 120 * freq * this.tuningDivisions / 10));
    }
  }

  protected setGain(gain: number) {
    this.settings.gain = gain;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setGain(gain);
    }
  }

  protected setQFactor(qfactor: number) {
    this.settings.qFactor = qfactor;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setQ(qfactor * 100);
    }
  }

  useFreqBendEnvelope(useFreqBendEnvelope: boolean) {
    this.settings.useFrequencyEnvelope = useFreqBendEnvelope ? onOff.on : onOff.off;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].useFreqBendEnvelope(useFreqBendEnvelope);
    }
  }

  private setFilterType(value: BiquadFilterType) {
    this.settings.filterType = value as filterTypes;
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].setType(value);
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

  connectToRingMod() : boolean {
    const ringMod = this.ringMod;
    let ok = false;
    if(ringMod) {
      ok = true;
      for (let i = 0; i < this.filters.length; i++) {
        this.filters[i].connect(ringMod.signalInput());
      }
    }
    return ok;
  }

  connectToPhasor() : boolean {
    const phasor = this.phasor;
    let ok = false;
    if(phasor) {
      ok = true;
      for (let i = 0; i < this.filters.length; i++) {
        this.filters[i].connect(phasor.input);
      }
    }
    return ok;
  }

  connectToReverb(): boolean {
    const reverb = this.reverb;
    let ok = false;
    if(reverb) {
      ok = true;
      for (let i = 0; i < this.filters.length; i++) {
        this.filters[i].connect(reverb.input);
      }
    }
    return ok;
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

  protected readonly dialStyle = dialStyle;


  protected setFreqAttack($event: number) {
    this.settings.freqBend.attackTime = $event * 3;
  }

  protected setFreqAttackLevel($event: number) {
    this.settings.freqBend.attackLevel = $event * 5;
  }

  protected setFreqDecayTime($event: number) {
    this.settings.freqBend.decayTime = $event * 3;
  }

  protected setFreqSustainLevel($event: number) {
    this.settings.freqBend.sustainLevel = $event * 5;
  }

  protected setFreqReleaseTime($event: number) {
    this.settings.freqBend.releaseTime = $event * 3;
  }

  protected setFreqReleaseLevel($event: number) {
    this.settings.freqBend.releaseLevel = $event * 5;
  }

  protected setModFrequency(freq: number) {
    this.settings.modFreq = freq;
    this.lfo.setFrequency(freq * 20);
  }

  protected setModLevel($event: number) {
    this.settings.modLevel = $event;
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].setModLevel($event);
    }
  }

  protected setModType(type: filterModType) {
    this.settings.modType = type;
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].modulation(this.lfo.oscillator, type);
    }
  }

  ngAfterViewInit(): void {
    const filterOutForm = this.filterOutputTo.nativeElement;
    for (let i = 0; i < filterOutForm.elements.length; ++i) {
      filterOutForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.output.emit(value);
        this.settings.output = value;
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
    const filterType = this.filterType.nativeElement;
    for (let i = 0; i < filterType.elements.length; ++i) {
      filterType.elements[i].addEventListener('change', ($event) => {
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
          this.settings.modWaveform = value as modWaveforms;
        })
      }
    }
  }
}
