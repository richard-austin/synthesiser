import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {dialStyle} from '../level-control/levelControlParameters';
import {LevelControlComponent} from '../level-control/level-control.component';
import {Filter} from '../modules/filter';
import {ReverbComponent} from '../reverb-component/reverb-component';
import {RingModulatorComponent} from '../ring-modulator/ring-modulator-component';
import {PhasorComponent} from '../phasor/phasor-component';
import {filterModType, filterTypes, modWaveforms, onOff} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {FilterSettings} from '../settings/filter';
import {Cookies} from '../settings/cookies/cookies';
import {Oscillator} from '../modules/oscillator';

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
  private lfo!: OscillatorNode;
  private audioCtx!: AudioContext;
  proxySettings!: FilterSettings
  private cookies!: Cookies;

  public get filters(): Filter[] {
    return this._filters;
  }

  @Input() numberOfFilters!: number;
  @Input() reverb!: ReverbComponent;
  @Input() ringMod!: RingModulatorComponent;
  @Input() phasor!: PhasorComponent;

  @Output() output = new EventEmitter<string>();
  @ViewChild('frequency') frequency!: LevelControlComponent;
  @ViewChild('deTune') deTune!: LevelControlComponent;
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
      this.lfo = new OscillatorNode(this.audioCtx);
      this.lfo.start();
      this.cookies = new Cookies();
      this.applySettings();
    }
    return ok;
  }

  // Called after all synth components have been started
  setOutputConnection () {
    SetRadioButtons.set(this.filterOutputTo, this.proxySettings.output);
  }

  applySettings(settings: FilterSettings = new FilterSettings()) {
    const cookieName = 'filter';

    const savedSettings = this.cookies.getSettings(cookieName);

    if(Object.keys(savedSettings).length > 0) {
      // Use values from cookie
      settings = savedSettings as FilterSettings;
    }
    // else use default settings

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);

    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters.push(new Filter(this.audioCtx));
      this.filters[i].setFrequency(this.keyToFrequency(i));
      this.filters[i].setDetune(this.proxySettings.deTune);
      this.filters[i].setFreqBendEnvelope(this.proxySettings.freqBend);
      this.filters[i].useFreqBendEnvelope(this.proxySettings.useFrequencyEnvelope === onOff.off);
      this.filters[i].setType(this.proxySettings.filterType);
    }

    this.frequency.setValue(this.proxySettings.frequency);  // Set frequency dial initial value.
    this.deTune.setValue(this.proxySettings.deTune);
    this.gain.setValue(this.proxySettings.gain);
    this.qfactor.setValue(this.proxySettings.qFactor);

    // Set up default frequency bend e=velope values
    this.freqAttack.setValue(this.proxySettings.freqBend.attackTime);
    this.freqAttackLevel.setValue(this.proxySettings.freqBend.attackLevel);
    this.freqDecay.setValue(this.proxySettings.freqBend.decayTime);
    this.freqSustain.setValue(this.proxySettings.freqBend.sustainLevel);
    this.freqSustain.setValue(this.proxySettings.freqBend.sustainLevel);
    this.freqRelease.setValue(this.proxySettings.freqBend.releaseTime);
    this.freqReleaseLevel.setValue(this.proxySettings.freqBend.releaseLevel);

    // Set up LFO default values
    this.modFreq.setValue(this.proxySettings.modFreq);  // Set dial
    this.modLevel.setValue(this.proxySettings.modLevel);  // Set dial

    // Set up the buttons
 //   SetRadioButtons.set(this.filterOutputTo, this.settings.output);
    SetRadioButtons.set(this.filterType, this.proxySettings.filterType);
    SetRadioButtons.set(this.freqEnveOnOff, this.proxySettings.useFrequencyEnvelope);
    SetRadioButtons.set(this.modSettingsForm, this.proxySettings.modType);
    SetRadioButtons.set(this.lfoWaveForm, this.proxySettings.modWaveform);
  }


  protected setFrequency(freq: number) {
    this.proxySettings.frequency = freq;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setFrequency(this.keyToFrequency(i));
    }
  }

  protected setGain(gain: number) {
    this.proxySettings.gain = gain;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setGain(gain);
    }
  }

  protected setDetune(deTune: number) {
    this.proxySettings.deTune = deTune;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setDetune(deTune);
    }
  }

  protected setQFactor(qfactor: number) {
    this.proxySettings.qFactor = qfactor;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setQ(qfactor);
    }
  }

  useFreqBendEnvelope(useFreqBendEnvelope: boolean) {
    this.proxySettings.useFrequencyEnvelope = useFreqBendEnvelope ? onOff.on : onOff.off;
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].useFreqBendEnvelope(useFreqBendEnvelope);
    }
  }

  private setFilterType(value: BiquadFilterType) {
    this.proxySettings.filterType = value as filterTypes;
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].setType(value);
    }
  }

  keyToFrequency(key: number) {
    return Oscillator.frequencyFactor * Math.pow(Math.pow(2, 1 / 12), (key + 1) + 120 * this.proxySettings.frequency * this.tuningDivisions / 10);
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

  keyDown(keyIndex: number, velocity: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfFilters) {
      this.filters[keyIndex].keyDown(velocity);
    }
  }

  keyUp(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfFilters) {
      this.filters[keyIndex].keyUp();
    }
  }

  midiPitchBend(value: number) {
    for (let i = 0; i < this.filters.length; i++) {
      this.filters[i].setDetune((value-0x40)*5+this.proxySettings.deTune);
    }
  }

  midiModLevel(value: number) {
    this.modLevel.setValue(value);
  }

  protected readonly dialStyle = dialStyle;


  protected setFreqAttack($event: number) {
    this.proxySettings.freqBend.attackTime = $event;
  }

  protected setFreqAttackLevel($event: number) {
    this.proxySettings.freqBend.attackLevel = $event;
  }

  protected setFreqDecayTime($event: number) {
    this.proxySettings.freqBend.decayTime = $event;
  }

  protected setFreqSustainLevel($event: number) {
    this.proxySettings.freqBend.sustainLevel = $event;
  }

  protected setFreqReleaseTime($event: number) {
    this.proxySettings.freqBend.releaseTime = $event;
  }

  protected setFreqReleaseLevel($event: number) {
    this.proxySettings.freqBend.releaseLevel = $event;
  }

  protected setModFrequency(freq: number) {
    this.proxySettings.modFreq = freq;
    this.lfo.frequency.value = freq * 20;
  }

  protected setModLevel($event: number) {
    this.proxySettings.modLevel = $event;
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].setModLevel($event);
    }
  }

  protected setModType(type: filterModType) {
    this.proxySettings.modType = type;
    for (let i = 0; i < this.numberOfFilters; ++i) {
      this.filters[i].modulation(this.lfo, type);
    }
  }

  ngAfterViewInit(): void {
    const filterOutForm = this.filterOutputTo.nativeElement;
    for (let i = 0; i < filterOutForm.elements.length; ++i) {
      filterOutForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.output.emit(value);
        this.proxySettings.output = value;
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
          this.lfo.type = value;
          this.proxySettings.modWaveform = value as modWaveforms;
        })
      }
    }
  }
}
