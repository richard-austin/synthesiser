import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {LevelControlComponent} from "../../level-control/level-control.component";
import {Oscillator} from '../../modules/oscillator';
import {OscillatorSettings} from '../../settings/oscillator';
import {Cookies} from '../../settings/cookies/cookies';
import {FilterComponent} from '../../filter/filter-component';
import {RingModulatorComponent} from '../../ring-modulator/ring-modulator-component';
import {ReverbComponent} from '../../reverb-component/reverb-component';
import {PhasorComponent} from '../../phasor/phasor-component';
import {SetRadioButtons} from '../../settings/set-radio-buttons';
import {modWaveforms, onOff, oscModType, oscWaveforms} from '../../enums/enums';
import {dialStyle} from '../../level-control/levelControlParameters';
import {timer} from 'rxjs';

@Component({
  selector: 'app-monophonic-oscillator',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './monophonic-oscillator-component.html',
  styleUrl: './monophonic-oscillator-component.scss',
})
export class MonophonicOscillatorComponent implements AfterViewInit {
  private oscillator!: Oscillator;
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
  @ViewChild('deTune') deTune!: LevelControlComponent;
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
  @ViewChild('portamento') portamento!: LevelControlComponent;

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
  setOutputConnection() {
    SetRadioButtons.set(this.oscOutputToForm, this.proxySettings.output);
  }

  applySettings(settings: OscillatorSettings = new OscillatorSettings()) {
    const cookieName = this.secondary ? 'monoOscillator2' : 'monoOscillator';

    const savedSettings = this.cookies.getSettings(cookieName);

    if (Object.keys(savedSettings).length > 0) {
      // Use values from cookie
      settings = savedSettings as OscillatorSettings;
    }
    // else use default settings

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);
    this.oscillator = new Oscillator(this.audioCtx);
    this.oscillator.setFrequency(this.keyToFrequency(0));
    this.oscillator.setAmplitudeEnvelope(this.proxySettings.adsr)
    this.oscillator.useAmplitudeEnvelope = this.proxySettings.useAmplitudeEnvelope === onOff.on;
    this.oscillator.setFreqBendEnvelope(this.proxySettings.freqBend);
    this.oscillator.useFreqBendEnvelope(this.proxySettings.useFrequencyEnvelope === onOff.on);
    this.oscillator.setType(this.proxySettings.waveForm);

    this.frequency.setValue(this.proxySettings.frequency);  // Set frequency dial initial value.

    this.deTune.setValue(this.proxySettings.deTune);
    this.gain.setValue(this.proxySettings.gain);
    this.portamento.setValue(this.proxySettings.portamento);

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
    this.oscillator.setFrequency(freq);
  }

  protected setGain(gain: number) {
    this.proxySettings.gain = gain;
    this.oscillator.setGain(gain);
  }

  protected setDetune(detune: number) {
    this.proxySettings.deTune = detune;
    dialStyle
    this.oscillator.setDetune(detune);
  }

  useAmplitudeEnvelope(useAmplitudeEnvelope: boolean) {
    this.proxySettings.useAmplitudeEnvelope = useAmplitudeEnvelope ? onOff.on : onOff.off;
    this.oscillator.useAmplitudeEnvelope = useAmplitudeEnvelope;

  }

  useFreqBendEnvelope(useFreqBendEnvelope: boolean) {
    this.proxySettings.useFrequencyEnvelope = useFreqBendEnvelope ? onOff.on : onOff.off;
    this.oscillator.useFreqBendEnvelope(useFreqBendEnvelope);
  }

  private setWaveForm(value: OscillatorType) {
    this.proxySettings.waveForm = value as oscWaveforms;
    this.oscillator.setType(value);
  }

  keyToFrequency(key: number) {
    return 225 * Math.pow(Math.pow(2, 1 / 12), (key + 1) + 120 * this.proxySettings.frequency * this.tuningDivisions / 10);
  }

  modulation(source: AudioNode, type: oscModType) {
    this.proxySettings.modType = type;
    this.oscillator.modulation(source, type);
  }

  modulationOff() {
    this.oscillator.modulationOff();
  }

  /**
   * connectToFilters: Connect to a group of filters
   */
  connectToFilters(): void {
     const filters = this.filters.filters;
     for(let i = 0; i < this.numberOfOscillators; ++i)
      this.oscillator.connect(filters[i].filter);
  }

  connectToRingMod(): boolean {
    const ringMod = this.ringMod;
    let ok = false;
    if (ringMod) {
      ok = true;
      const secondary = this.secondary;
      this.oscillator.connect(secondary ? ringMod.modInput() : ringMod.signalInput());
    }
    return ok;
  }

  connectToReverb(): boolean {
    const reverb = this.reverb;
    let ok = false;
    if (reverb) {
      ok = true;
      this.oscillator.connect(reverb.input);
    }
    return ok;
  }

  connectToPhasor(): void {
    const phasor = this.phasor;
    if (phasor) {
      this.oscillator.connect(phasor.input);
    }
  }

  /**
   * connect: Connect all oscillator in this group to a single node (i.e. gain node).
   * @param node
   */
  connect(node: AudioNode) {
    this.oscillator.connect(node);
  }

  disconnect() {
    this.oscillator.disconnect();
  }

  downKeys: Set<number> = new Set();

  keyDown(keyIndex: number) {
    const freq = this.keyToFrequency(keyIndex);
    this.oscillator.freq = freq;
    if (!this.downKeys.has(keyIndex))
      this.downKeys.add(keyIndex);
   // this.oscillator.oscillator.frequency.cancelAndHoldAtTime(0);
    this.oscillator.oscillator.frequency.setValueAtTime(this.oscillator.oscillator.frequency.value, 0);
    this.oscillator.oscillator.frequency.exponentialRampToValueAtTime(freq, this.audioCtx.currentTime + this.proxySettings.portamento);
    this.oscillator.keyDown();
  }

  keyUp(keyIndex: number) {
    if (this.downKeys.has(keyIndex))
      this.downKeys.delete(keyIndex);
    if (this.downKeys.size === 0)
      this.oscillator.keyUp();
  }


  protected setPortamento($event: number) {
    this.proxySettings.portamento  = $event;
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
      this.oscillator.setModLevel($event);
    }
  }

  protected setModType(type: oscModType) {
    this.proxySettings.modType = type;
    for (let i = 0; i < this.numberOfOscillators; ++i) {
      this.oscillator.modulation(this.lfo.oscillator, type);
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
