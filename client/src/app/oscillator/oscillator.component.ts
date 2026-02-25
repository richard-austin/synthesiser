import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
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
import {ChordProcessor} from '../modules/chord-processor';
import DevicePoolManager from '../util-classes/device-pool-manager';
import {DeviceKeys, DevicePoolManagerService} from '../services/device-pool-manager-service';

export type PortamentoType =
  'chord'
  | 'last'
  | 'first'
  | 'lowest'
  | 'highest'
  | 'plus12'
  | 'plus24'
  | 'minus12'
  | 'minus24';

@Component({
  selector: 'app-oscillators',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './oscillator.component.html',
  styleUrl: './oscillator.component.scss',
})
export class OscillatorComponent implements AfterViewInit, OnDestroy {
  private oscillators: Oscillator[] = [];
  protected tuningDivisions = 6;
  private lfo!: OscillatorNode;
  private audioCtx!: AudioContext;
  private proxySettings!: OscillatorSettings;
  private cookies!: Cookies;
  private velocitySensitive: boolean = true;
  private modulators!: OscillatorComponent;
  private oscillatorPoolMgr!: DevicePoolManager;
  private chordProcessor!: ChordProcessor;

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
  @ViewChild('portamentoType') portamentoType!: ElementRef<HTMLSelectElement>;

  @ViewChild('oscOutputToForm') oscOutputToForm!: ElementRef<HTMLFormElement>;

  @ViewChild('freqEnveOnOffForm') freqEnveOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('amplitudeEnvelopeOnOffForm') amplitudeEnvelopeOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('velocity') velocityOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('oscWaveform') oscWaveForm!: ElementRef<HTMLSelectElement>;

  @ViewChild('modSettingsForm') modSettingsForm!: ElementRef<HTMLFormElement>;
  @ViewChild('oscModSettingsForm') oscModSettingsForm!: ElementRef<HTMLFormElement>;

  @ViewChild('modFreq') modFreq!: LevelControlComponent;
  @ViewChild('modDepth') modLevel!: LevelControlComponent;
  @ViewChild('modWaveForm') lfoWaveForm!: ElementRef<HTMLFormElement>;
  @ViewChild('mod2Depth') mod2Level!: LevelControlComponent;

  private devicePoolManagerService = inject(DevicePoolManagerService);

  start(audioCtx: AudioContext, settings: OscillatorSettings | null): boolean {
    let ok = false;
    this.audioCtx = audioCtx;
    this.cookies = new Cookies();
    this.chordProcessor = new ChordProcessor();
    this.chordProcessor.setKeyDownCallback(this.chordProcessorKeyDownCallback);
    if (this.numberOfOscillators) {
      this.lfo = this.audioCtx.createOscillator();
      this.lfo.start();
      this.applySettings(settings);
      ok = true;
    }
    return ok;
  }

  // Called after all synth components have been started
  setOutputConnection() {
    SetRadioButtons.set(this.oscOutputToForm, this.proxySettings.output);
  }

  applySettings(settings: OscillatorSettings | null) {
    const cookieName = (this.secondary ? 'oscillator2' : 'oscillator');
    if (!settings) {  // If no settings supplied, create default and check if previously saved in cookie
      settings = new OscillatorSettings();
      const savedSettings = this.cookies.getSettings(cookieName, settings);

      if (Object.keys(savedSettings).length > 0) {
        // Use values from cookie
        settings = savedSettings as OscillatorSettings;
      }
      // else use default settings
    }

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);

    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.oscillators.push(new Oscillator(this.audioCtx));
      this.oscillators[i].setFrequency(this.keyToFrequency(i));
      this.oscillators[i].setAmplitudeEnvelope(this.proxySettings.adsr)
      this.oscillators[i].useAmplitudeEnvelope = this.proxySettings.useAmplitudeEnvelope === onOff.on;
      this.oscillators[i].setFreqBendEnvelope(this.proxySettings.freqBend);
      this.oscillators[i].useFreqBendEnvelope(this.proxySettings.useFrequencyEnvelope === onOff.on);
      this.oscillators[i].setType(this.proxySettings.waveForm);
    }
    this.oscillatorPoolMgr = new DevicePoolManager(this.oscillators, this.proxySettings);
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
    if (!this.proxySettings.mod2Level)
      this.proxySettings.mod2Level = 0;
    this.mod2Level.setValue(this.proxySettings.mod2Level);  // Set dial

    this.modulation(this.lfo, this.proxySettings.modType);
    // Set up the buttons and selectors
    this.oscWaveForm.nativeElement.value = this.proxySettings.waveForm;
    this.portamentoType.nativeElement.value = this.proxySettings.portamentoType;

    SetRadioButtons.set(this.amplitudeEnvelopeOnOffForm, this.proxySettings.useAmplitudeEnvelope);
    SetRadioButtons.set(this.velocityOnOffForm, this.proxySettings.velocitySensitive);
    SetRadioButtons.set(this.freqEnveOnOffForm, this.proxySettings.useFrequencyEnvelope);
    SetRadioButtons.set(this.modSettingsForm, this.proxySettings.modType);
    SetRadioButtons.set(this.lfoWaveForm, this.proxySettings.modWaveform);
  }

  public setModulators(modulators: OscillatorComponent) {
    this.modulators = modulators;

    this.modulation2(this.modulators.oscillators, this.proxySettings.modType2);
    if (this.proxySettings.modType2)  // In case config or cookie predates addition of this field
      SetRadioButtons.set(this.oscModSettingsForm, this.proxySettings.modType2);
  }

  public getSettings(): OscillatorSettings {
    return this.proxySettings;
  }

  protected setFrequency(freq: number) {
    this.proxySettings.frequency = freq;
    this.oscillatorPoolMgr.setFrequency(freq);
  }

  protected setGain(gain: number) {
    this.proxySettings.gain = gain;
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].setGain(gain);
    }
  }

  protected setDetune(detune: number) {
    this.proxySettings.deTune = detune;
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].setDetune(detune);
    }
  }

  useAmplitudeEnvelope(useAmplitudeEnvelope: boolean) {
    this.proxySettings.useAmplitudeEnvelope = useAmplitudeEnvelope ? onOff.on : onOff.off;
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].useAmplitudeEnvelope = useAmplitudeEnvelope;
    }
  }

  useVelocitySensitive(velocitySensitive: boolean) {
    this.proxySettings.velocitySensitive = velocitySensitive ? onOff.on : onOff.off;
    this.velocitySensitive = velocitySensitive;
  }

  useFreqBendEnvelope(useFreqBendEnvelope: boolean) {
    if (useFreqBendEnvelope)
      this.portamento.setValue(0); // Cannot use portamento with frequency envelope

    this.proxySettings.useFrequencyEnvelope = useFreqBendEnvelope ? onOff.on : onOff.off;
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].useFreqBendEnvelope(useFreqBendEnvelope);
    }
  }

  private setWaveForm(value: OscillatorType) {
    this.proxySettings.waveForm = value as oscWaveforms;
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.oscillators[i].setType(value);
    }
  }

  private setPortamentoType(value: PortamentoType) {
    this.proxySettings.portamentoType = value as PortamentoType;
  }

  keyToFrequency = (key: number) => {
    return Oscillator.frequencyFactor * Math.pow(Math.pow(2, 1 / 12), (key + 1) + 120 * this.proxySettings.frequency * this.tuningDivisions / 10);
  }

  modulation(source: AudioNode, type: oscModType) {
    this.proxySettings.modType = type;
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.oscillators[i].modulation(source, type);
    }
  }

  modulation2(modulators: Oscillator[], type: oscModType) {
    this.proxySettings.modType2 = type;
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.oscillators[i].modulation2(type, modulators[i]);
    }
  }

  protected setModType(type: oscModType) {
    this.proxySettings.modType = type;
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.oscillators[i].modulation(this.lfo, type);
    }
  }

  protected setMod2Type(type: oscModType) {
    this.proxySettings.modType2 = type;
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.oscillators[i].modulation2(type);
    }
  }

  /**
   * connectToFilters: Connect to a group of filters
   */
  connectToFilters(): boolean {
    const filters = this.filters.filters;
    let ok = false;
    if (filters) {
      const offset = this.secondary ? DevicePoolManager.numberOfDevices * 2 : DevicePoolManager.numberOfDevices;
      ok = true;
      for (let i = 0; i < this.oscillators.length; i++) {
        this.oscillators[i].connect(filters[i + offset].filter);
      }
    } else
      console.log("Filter array is a different size to the oscillator array")
    return ok;
  }

  connectToRingMod(): boolean {
    const ringMod = this.ringMod;
    let ok = false;
    if (ringMod) {
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
    if (reverb) {
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
    if (phasor) {
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

  keysDown: DeviceKeys[] = [];

  keyDown(keyIndex: number, velocity: number) {
    const keys: DeviceKeys | undefined = this.oscillatorPoolMgr.keyDown(keyIndex, velocity, this.proxySettings.portamento === 0);
    if (keys) {
      if (!this.secondary)
        this.devicePoolManagerService.keyDownOscillator1(keys);  // Trigger appropriate filter bank
      else
        this.devicePoolManagerService.keyDownOscillator2(keys);  // Trigger appropriate filter bank
    }

    const lastKey = this.keysDown.length > 0 ? this.keysDown[this.keysDown.length - 1] : null;
    if (-1 === this.keysDown.findIndex(key => key.keyIndex === keyIndex)) {
      this.keysDown.push(keys as DeviceKeys);
    }

    if (!this.velocitySensitive)
      velocity = 0x7f;

    if (keys !== undefined && this.proxySettings.portamento > 0) {
      this.oscillators[keys.deviceIndex].oscillator.frequency.cancelAndHoldAtTime(this.audioCtx.currentTime);
      const proxySettings = this.proxySettings;
      switch (proxySettings.portamentoType) {
        case 'chord':
          const clonedKeys = structuredClone(keys);
          if (!this.chordProcessor.addNote(structuredClone(clonedKeys)))
            return;  // Less than the minimum time flor a chord
          this.chordProcessor.setStartNote(clonedKeys, this.oscillators[keys.deviceIndex], this.keyToFrequency);
          break;
        case 'last':
          if (lastKey)
            this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(lastKey.keyIndex);
          break;
        case 'first':
          const firstKeys = this.keysDown[0];
          this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(firstKeys.keyIndex);
          break;
        case 'lowest':
          const lowestKey = Math.min(...this.keysDown.map(keys => keys.keyIndex));
          if (lowestKey !== undefined)
            this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(lowestKey);
          break;
        case 'highest':
          const highestKey = Math.max(...this.keysDown.map(keys => keys.keyIndex));
          this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(highestKey);
          break;
        case 'plus12':
          this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(keyIndex) * 2;
          break;
        case 'plus24':
          this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(keyIndex) * 4;
          break;
        case 'minus12':
          this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(keyIndex) / 2;
          break;
        case 'minus24':
          this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(keyIndex) / 4;
          break;
      }

      this.oscillators[keys.deviceIndex].oscillator.frequency.exponentialRampToValueAtTime(this.keyToFrequency(keyIndex), this.audioCtx.currentTime + this.proxySettings.portamento);
    }

    if (keys && keys.deviceIndex < this.numberOfOscillators) {
      // console.log("fx = " + this.oscillators[keyIndex].oscillator.frequency.value);
      this.oscillators[keys.deviceIndex].keyDown(velocity);
    }
  }

  private chordProcessorKeyDownCallback: (prevKeys: DeviceKeys, theseKeys: DeviceKeys) => void = (prevKeyIndex: DeviceKeys, keyIndex: DeviceKeys) => {
    this.oscillators[keyIndex.deviceIndex].oscillator.frequency.value = this.keyToFrequency(prevKeyIndex.keyIndex);
    this.oscillators[keyIndex.deviceIndex].oscillator.frequency.exponentialRampToValueAtTime(this.keyToFrequency(keyIndex.keyIndex), this.audioCtx.currentTime + this.proxySettings.portamento);
    this.oscillators[keyIndex.deviceIndex].keyDown(0x7f);  // TODO: Need to pass velocity through ChordProcessor
  }

  keyUp(keyIndex: number) {
    const keys: DeviceKeys | undefined = this.oscillatorPoolMgr.keyUp(keyIndex);
    if (keys) {
      const sub = timer(this.proxySettings.adsr.releaseTime * 1000).subscribe(() => {
        sub.unsubscribe();
        const idx = this.keysDown.findIndex(key => key.keyIndex === keyIndex);
        if (idx > -1)
          this.keysDown.splice(idx, 1);
        console.log("keysDown.length = ", this.keysDown.length, " idx = ", idx);
      });

      if (!this.secondary)
        this.devicePoolManagerService.keyUpOscillator1(keys);  // Trigger appropriate filter bank
      else
        this.devicePoolManagerService.keyUpOscillator2(keys);  // Trigger appropriate filter bank

      if (this.proxySettings.portamentoType === 'chord')
        if (this.proxySettings.useAmplitudeEnvelope === onOff.on)
          this.chordProcessor.release(this.proxySettings.adsr.releaseTime);
        else
          this.chordProcessor.release(this.proxySettings.adsr.decayTime+this.proxySettings.adsr.releaseTime);
    }
  }

  protected setPortamento($event: number) {
    this.proxySettings.portamento = $event;
    if ($event > 0) {
      // Can't use frequency bend envelope with portamento
      this.proxySettings.useFrequencyEnvelope = onOff.off;
      SetRadioButtons.set(this.freqEnveOnOffForm, this.proxySettings.useFrequencyEnvelope);
    }
  }

  midiPitchBend(value: number) {
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].setDetune((value - 0x40) * 5 + this.proxySettings.deTune);
    }
  }

  midiModLevel(value: number) {
    this.modLevel.setValue(value);
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

  private readonly modFreqBase = 30;
  private readonly modFreqMaxInput = 2;
  private readonly modFreqMax = 4000;
  private readonly modFreqFactor = this.modFreqMax / (Math.pow(this.modFreqBase, this.modFreqMaxInput) - 1);

  protected setModFrequency(freq: number) {
    this.proxySettings.modFreq = freq;
    this.lfo.frequency.value = this.modFreqFactor * (Math.pow(this.modFreqBase, freq) - 1);
  }

  protected setModLevel($event: number) {
    this.proxySettings.modLevel = $event;
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.oscillators[i].setModLevel($event);
    }
  }

  protected setMod2Level($event: number) {
    this.proxySettings.mod2Level = $event;
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.oscillators[i].setMod2Level($event);
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
    const velocityOnOffForm = this.velocityOnOffForm.nativeElement;
    for (let i = 0; i < velocityOnOffForm.elements.length; ++i) {
      velocityOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.useVelocitySensitive(value === 'on');
      });
    }
    const waveform = this.oscWaveForm.nativeElement;
    waveform.addEventListener('change', ($event) => {
      // @ts-ignore
      const value = $event.target.value as OscillatorType;
      this.setWaveForm(value as OscillatorType);
    });

    const portamentoType = this.portamentoType.nativeElement;
    portamentoType.addEventListener('change', ($event) => {
      // @ts-ignore
      const value = $event.target.value as PortamentoType
      this.setPortamentoType(value as PortamentoType);
    });

    const modSettingsForm = this.modSettingsForm.nativeElement;
    for (let j = 0; j < modSettingsForm.elements.length; ++j) {
      modSettingsForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as modulationType;
        this.setModType(value);
      });
    }

    const oscModSettingsForm = this.oscModSettingsForm.nativeElement;
    for (let j = 0; j < oscModSettingsForm.elements.length; ++j) {
      oscModSettingsForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as modulationType;
        this.setMod2Type(value);
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

  ngOnDestroy(): void {
    for (let i = 0; i < this.oscillators.length; i++) {
      // @ts-ignore
      this.oscillators[i] = undefined;
    }
  }

  showWaveformSelector = false;

  protected selectWaveform($event: Event) {
    // @ts-ignore
    this.showWaveformSelector = $event.target.checked;
  }

  protected readonly Oscillator = Oscillator;
}
