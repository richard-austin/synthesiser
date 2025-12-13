import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {Oscillator} from '../modules/oscillator';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {FilterComponent} from '../filter/filter-component';
import {RingModulatorComponent} from '../ring-modulator/ring-modulator-component';
import {ReverbComponent} from '../reverb-component/reverb-component';
import {PhasorComponent} from '../phasor/phasor-component';
import {OscillatorSettings} from '../settings/oscillator';
import {oscModType} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {timer} from 'rxjs';

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
  protected tuningDivisions = 6;
  private lfo!: Oscillator;
  private audioCtx!: AudioContext;
  private settings!: OscillatorSettings;
  @Input() filters!: FilterComponent;
  @Input() ringMod!: RingModulatorComponent;
  @Input() reverb!: ReverbComponent;
  @Input() phasor!: PhasorComponent;
  @Input() secondary!: boolean;  // Flag to determine whether to connect to ring mod signal or mod input

  @Input() numberOfOscillators!: number;
  @Input() name!: string;

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
  @ViewChild('lfoWaveForm') lfoWaveForm!: ElementRef<HTMLFormElement>;

  start(audioCtx: AudioContext): boolean {
    let ok = false;
    this.audioCtx = audioCtx;
    if (this.numberOfOscillators) {
      this.lfo = new Oscillator(this.audioCtx);
      this.applySettings();
      ok = true;
    }
    return ok;
  }

  applySettings(settings: OscillatorSettings = new OscillatorSettings()) {
    this.settings = settings;
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators.push(new Oscillator(this.audioCtx));
      this.oscillators[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
      this.oscillators[i].setAmplitudeEnvelope(this.settings.adsr)
      this.oscillators[i].useAmplitudeEnvelope = true;
      // this.oscillators[i].setGain(.1);
      this.oscillators[i].setFreqBendEnvelope(this.settings.freqBend);
      this.oscillators[i].useFreqBendEnvelope(false);
      this.oscillators[i].setType(this.settings.waveForm);
    }

    this.frequency.setValue(0);  // Set frequency dial initial value.
    this.gain.setValue(this.settings.gain);
    this.attack.setValue(this.settings.adsr.attackTime);
    this.decay.setValue(this.settings.adsr.decayTime);
    this.sustain.setValue(this.settings.adsr.sustainLevel);
    this.release.setValue(this.settings.adsr.releaseTime);

    // Set up default frequency bend envelope values
    this.freqAttack.setValue(this.settings.freqBend.attackTime);
    this.freqAttackLevel.setValue(this.settings.freqBend.attackLevel);
    this.freqDecay.setValue(this.settings.freqBend.decayTime);
    this.freqSustain.setValue(this.settings.freqBend.sustainLevel);
    this.freqRelease.setValue(this.settings.freqBend.releaseTime);
    this.freqReleaseLevel.setValue(this.settings.freqBend.releaseLevel);

    // Set up LFO default values
    this.modFreq.setValue(this.settings.modFreq);  // Set dial
    this.modLevel.setValue(this.settings.modLevel);  // Set dial
    this.modulation(this.lfo.oscillator, this.settings.modType);

    // Set up the buttons
    SetRadioButtons.set(this.oscOutputToForm, this.settings.output);
    SetRadioButtons.set(this.oscWaveForm, this.settings.waveForm);
    SetRadioButtons.set(this.amplitudeEnvelopeOnOffForm, this.settings.useAmplitudeEnvelope);
    SetRadioButtons.set(this.freqEnveOnOffForm, this.settings.useFrequencyEnvelope);
    SetRadioButtons.set(this.modSettingsForm, this.settings.modType);
    SetRadioButtons.set(this.lfoWaveForm, this.settings.modWaveform);
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

  modulation(source: AudioNode, type: oscModType) {
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
   */
  connectToFilters(): boolean {
    const filters = this.filters.filters;
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

  connectToRingMod() : boolean {
    const ringMod = this.ringMod;
    let ok = false;
    if(ringMod) {
      ok = true;
      const secondary = this.secondary;
      for (let i = 0; i < this.oscillators.length; i++) {
        this.oscillators[i].connect(secondary ? ringMod.modInput() : ringMod.signalInput());
      }
    }
    return ok;
  }

  connectToReverb(): boolean {
    const reverb = this.reverb;
    let ok = false;
    if(reverb) {
      ok = true;
      for (let i = 0; i < this.oscillators.length; i++) {
        this.oscillators[i].connect(reverb.input);
      }
    }
    return ok;
  }

  connectToPhasor(): boolean {
    const phasor = this.phasor;
    let ok = false;
    if(phasor) {
      ok = true;
      for (let i = 0; i < this.oscillators.length; i++) {
        this.oscillators[i].connect(phasor.input);
      }
    }
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
    this.settings.adsr.attackTime = $event;
  }

  protected setDecayTime($event: number) {
    this.settings.adsr.decayTime = $event * 10;
  }

  protected setSustainLevel($event: number) {
    this.settings.adsr.sustainLevel = $event;
  }

  protected setReleaseTime($event: number) {
    this.settings.adsr.releaseTime = $event * 10;
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
    this.lfo.setFrequency(freq * 20);
  }

  protected setModLevel($event: number) {
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].setModLevel($event);
    }
  }

  protected setModType(type: oscModType) {
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].modulation(this.lfo.oscillator, type);
    }
  }

  ngAfterViewInit(): void {
    const oscOutForm = this.oscOutputToForm.nativeElement;
    for (let i = 0; i < oscOutForm.elements.length; ++i) {
      oscOutForm.elements[i].addEventListener('change', ($event) => {
        const target = $event.target;

        const sub = timer(10).subscribe(() => {
          sub.unsubscribe();
          // @ts-ignore
          this.output.emit(target.value);
        });
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
