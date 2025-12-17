import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {Oscillator} from '../modules/oscillator';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {FilterComponent} from '../filter/filter-component';
import {RingModulatorComponent} from '../ring-modulator/ring-modulator-component';
import {ReverbComponent} from '../reverb-component/reverb-component';
import {PhasorComponent} from '../phasor/phasor-component';
import {OscillatorSettings} from '../settings/oscillator';
import {modWaveforms, onOff, oscModType, oscWaveforms} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {timer} from 'rxjs';
import {Cookies} from '../settings/cookies/cookies';

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
  private proxySettings!: OscillatorSettings;
  private cookies!: Cookies;

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
    this.cookies = new Cookies();
    if (this.numberOfOscillators) {
      this.lfo = new Oscillator(this.audioCtx);
      this.applySettings();
      ok = true;
    }
    return ok;
  }
  // Called after all synth components have been started
  setOutputConnection () {
    SetRadioButtons.set(this.oscOutputToForm, this.proxySettings.output);
  }

  applySettings(settings: OscillatorSettings = new OscillatorSettings()) {
    const cookieName = this.secondary ? 'oscillator2' : 'oscillator';

    const savedSettings = this.cookies.getSettings(cookieName);

    if(Object.keys(savedSettings).length > 0) {
      // Use values from cookie
      settings = savedSettings as OscillatorSettings;
    }
    // else use default settings

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators.push(new Oscillator(this.audioCtx));
      this.oscillators[i].setFrequency(450 * Math.pow(Math.pow(2, 1 / 12), (i + 1) + 120 * this.proxySettings.frequency * this.tuningDivisions / 10));
      this.oscillators[i].setAmplitudeEnvelope(this.proxySettings.adsr)
      this.oscillators[i].useAmplitudeEnvelope = this.proxySettings.useAmplitudeEnvelope === onOff.on;
      // this.oscillators[i].setGain(.1);
      this.oscillators[i].setFreqBendEnvelope(this.proxySettings.freqBend);
      this.oscillators[i].useFreqBendEnvelope(this.proxySettings.useFrequencyEnvelope === onOff.on);
      this.oscillators[i].setType(this.proxySettings.waveForm);
    }

    this.frequency.setValue(this.proxySettings.frequency);  // Set frequency dial initial value.
    this.gain.setValue(this.proxySettings.gain);
    this.attack.setValue(this.proxySettings.adsr.attackTime);
    this.decay.setValue(this.proxySettings.adsr.decayTime);
    this.sustain.setValue(this.proxySettings.adsr.sustainLevel);
    this.release.setValue(this.proxySettings.adsr.releaseTime);

    // Set up default frequency bend envelope values
    this.freqAttack.setValue(this.proxySettings.freqBend.attackTime);
    this.freqAttackLevel.setValue(this.proxySettings.freqBend.attackLevel);
    this.freqDecay.setValue(this.proxySettings.freqBend.decayTime);
    this.freqSustain.setValue(this.proxySettings.freqBend.sustainLevel);
    this.freqRelease.setValue(this.proxySettings.freqBend.releaseTime);
    this.freqReleaseLevel.setValue(this.proxySettings.freqBend.releaseLevel);

    // Set up LFO default values
    this.modFreq.setValue(this.proxySettings.modFreq);  // Set dial
    this.modLevel.setValue(this.proxySettings.modLevel);  // Set dial
    this.modulation(this.lfo.oscillator, this.proxySettings.modType);

    // Set up the buttons
  //  SetRadioButtons.set(this.oscOutputToForm, this.proxySettings.output);
    SetRadioButtons.set(this.oscWaveForm, this.proxySettings.waveForm);
    SetRadioButtons.set(this.amplitudeEnvelopeOnOffForm, this.proxySettings.useAmplitudeEnvelope);
    SetRadioButtons.set(this.freqEnveOnOffForm, this.proxySettings.useFrequencyEnvelope);
    SetRadioButtons.set(this.modSettingsForm, this.proxySettings.modType);
    SetRadioButtons.set(this.lfoWaveForm, this.proxySettings.modWaveform);
  }

  protected setFrequency(freq: number) {
    this.proxySettings.frequency = freq;
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].setFrequency(450 * Math.pow(Math.pow(2, 1 / 12), (i + 1) + 120 * freq * this.tuningDivisions / 10));
    }
  }

  protected setGain(gain: number) {
    this.proxySettings.gain = gain;
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].setGain(gain);
    }
  }

  useAmplitudeEnvelope(useAmplitudeEnvelope: boolean) {
    this.proxySettings.useAmplitudeEnvelope = useAmplitudeEnvelope ? onOff.on : onOff.off;
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].useAmplitudeEnvelope = useAmplitudeEnvelope;
    }
  }

  useFreqBendEnvelope(useFreqBendEnvelope: boolean) {
    this.proxySettings.useFrequencyEnvelope = useFreqBendEnvelope ? onOff.on : onOff.off;
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].useFreqBendEnvelope(useFreqBendEnvelope);
    }
  }

  private setWaveForm(value: OscillatorType) {
    this.proxySettings.waveForm = value as oscWaveforms;
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].setType(value);
    }
  }

  modulation(source: AudioNode, type: oscModType) {
    this.proxySettings.modType = type;
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
    this.proxySettings.adsr.attackTime = $event;
  }

  protected setDecayTime($event: number) {
    this.proxySettings.adsr.decayTime = $event;
  }

  protected setSustainLevel($event: number) {
    this.proxySettings.adsr.sustainLevel = $event;
  }

  protected setReleaseTime($event: number) {
    this.proxySettings.adsr.releaseTime = $event;
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
    this.lfo.setFrequency(freq * 20);
  }

  protected setModLevel($event: number) {
    this.proxySettings.modLevel = $event;
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].setModLevel($event);
    }
  }

  protected setModType(type: oscModType) {
    this.proxySettings.modType = type;
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillators[i].modulation(this.lfo.oscillator, type);
    }
  }

  ngAfterViewInit(): void {
    const oscOutForm = this.oscOutputToForm.nativeElement;
    for (let i = 0; i < oscOutForm.elements.length; ++i) {
      oscOutForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        const sub = timer(10).subscribe(() => {
          sub.unsubscribe();
          // @ts-ignore
          this.output.emit(value);
          this.proxySettings.output = value;
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
          this.proxySettings.modWaveform = value as modWaveforms;
        })
      }
    }
  }
}
