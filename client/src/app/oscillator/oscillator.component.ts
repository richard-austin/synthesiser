import {
  AfterViewInit, ChangeDetectorRef,
  Component,
  ElementRef,
  inject, input, output,
  InputSignal,
  OnDestroy,
  OutputEmitterRef, viewChild, Signal
} from '@angular/core';
import {OscillatorParams} from '../modules/oscillator';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {FilterComponent} from '../filter/filter-component';
import {RingModulatorComponent} from '../ring-modulator/ring-modulator-component';
import {ReverbComponent} from '../reverb-component/reverb-component';
import {PhaserComponent} from '../phaser/phaser.component';
import {OscillatorSettings} from '../settings/oscillator';
import {modWaveforms, onOff, oscModOutput, oscWaveforms} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {timer} from 'rxjs';
import {Cookies} from '../settings/cookies/cookies';
import {ChordProcessor} from '../modules/chord-processor';
import {DeviceKeys} from '../services/device-pool-manager-service';
import {ClipboardService} from './clipboard-service';
import {FmSynthService} from '../services/fm-synth-service';
import {WaveTables} from '../modules/wavetables';
export enum envelopePhase {inactive, attack, decay, sustain, release, retrigger, legato }
export enum pitchEnvelopePhase {inactive, attack, attackLevel, decay, sustainLevel, release, releaseLevel, retrigger}

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
  standalone: true
})
export class OscillatorComponent implements AfterViewInit, OnDestroy {
  protected tuningDivisions = 6;
  private audioCtx!: AudioContext;
 // private wasmBinary!: ArrayBuffer;
  private proxySettings!: OscillatorSettings;
  private cookies!: Cookies;
  private chordProcessor!: ChordProcessor;

  filters: InputSignal<FilterComponent> = input.required<FilterComponent>();
  ringMod: InputSignal<RingModulatorComponent> = input.required<RingModulatorComponent>();
  reverb: InputSignal<ReverbComponent> = input.required<ReverbComponent>();
  phaser: InputSignal<PhaserComponent> = input.required<PhaserComponent>();
  oscNumber: InputSignal<number> = input.required<number>();  // Flag to determine whether to connect to ring mod signal or mod input
  params: InputSignal<OscillatorParams> = input.required<OscillatorParams>();

  oscPanel: Signal<ElementRef<HTMLDivElement>> = viewChild.required<ElementRef<HTMLDivElement>>('oscPanel');
  contextMenu: Signal<ElementRef<HTMLDivElement>> = viewChild.required<ElementRef<HTMLDivElement>>('contextMenu');

  output: OutputEmitterRef<string> = output<string>();

  frequency: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('frequency');
  deTune: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('deTune');
  gain: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('gain');
  balance: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('balance');
  attack: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('attack');
  decay: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('decay');
  sustain: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('sustain');
  release: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('release');


  readonly freqAttack = viewChild.required<LevelControlComponent>('freqAttack');
  readonly freqAttackLevel = viewChild.required<LevelControlComponent>('freqAttackLevel');
  readonly freqDecay = viewChild.required<LevelControlComponent>('freqDecay');
  readonly freqSustain = viewChild.required<LevelControlComponent>('freqSustain');
  readonly freqRelease = viewChild.required<LevelControlComponent>('freqRelease');
  readonly freqReleaseLevel = viewChild.required<LevelControlComponent>('freqReleaseLevel');
  portamento: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('portamento');
  readonly portamentoType = viewChild.required<ElementRef<HTMLSelectElement>>('portamentoType');

  readonly oscOutputToForm = viewChild.required<ElementRef<HTMLFormElement>>('oscOutputToForm');

  readonly freqEnveOnOffForm = viewChild.required<ElementRef<HTMLFormElement>>('freqEnveOnOffForm');
  readonly legatoOnOffForm = viewChild.required<ElementRef<HTMLFormElement>>('legatoOnOffForm');
  readonly velocityOnOffForm = viewChild.required<ElementRef<HTMLFormElement>>('velocity');
  readonly oscWaveForm = viewChild.required<ElementRef<HTMLSelectElement>>('oscWaveform');

  readonly modSettingsForm = viewChild.required<ElementRef<HTMLFormElement>>('modSettingsForm');
  readonly oscModOutputForm = viewChild.required<ElementRef<HTMLFormElement>>('oscModOutputForm');

  readonly modFreq = viewChild.required<LevelControlComponent>('modFreq');
  readonly modLevel = viewChild.required<LevelControlComponent>('modDepth');
  readonly lfoWaveForm = viewChild.required<ElementRef<HTMLFormElement>>('modWaveForm');

  readonly fmSynthService: FmSynthService = inject(FmSynthService);

  clipboard: ClipboardService = inject(ClipboardService);
  cd: ChangeDetectorRef = inject(ChangeDetectorRef);

  async start(audioCtx: AudioContext, settings: OscillatorSettings | null): Promise<void> {
    this.audioCtx = audioCtx;
   // this.wasmBinary = wasmBinary;
    this.cookies = new Cookies();
    this.chordProcessor = new ChordProcessor();
    this.chordProcessor.setKeyDownCallback(this.chordProcessorKeyDownCallback);
    await this.applySettings(settings);
  }

  async applySettings(settings: OscillatorSettings | null) {
    const cookieName = "oscillator" + this.params().settingsId;
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
    this.fmSynthService.applySettings(this.proxySettings, this.oscNumber());

    this.frequency().setValue(this.proxySettings.frequency);  // Set frequency dial initial value.
    this.deTune().setValue(this.proxySettings.deTune);
    this.gain().setValue(this.proxySettings.gain);
    this.balance().setValue(this.proxySettings.balance ? this.proxySettings.balance : 0);

    this.portamento().setValue(this.proxySettings.portamento);

    this.attack().setValue(this.proxySettings.adsr.attackTime);
    this.decay().setValue(this.proxySettings.adsr.decayTime);
    this.sustain().setValue(this.proxySettings.adsr.sustainLevel);
    this.release().setValue(this.proxySettings.adsr.releaseTime);

    // Set up default frequency bend envelope values
    this.freqAttack().setValue(this.proxySettings.freqBend.attackTime);
    this.freqAttackLevel().setValue(this.proxySettings.freqBend.attackLevel);
    this.freqDecay().setValue(this.proxySettings.freqBend.decayTime);
    this.freqSustain().setValue(this.proxySettings.freqBend.sustainLevel);
    this.freqRelease().setValue(this.proxySettings.freqBend.releaseTime);
    this.freqReleaseLevel().setValue(this.proxySettings.freqBend.releaseLevel);

    // Set up LFO default values
    this.modFreq().setValue(this.proxySettings.modFreq);  // Set dial
    this.modLevel().setValue(this.proxySettings.modLevel);  // Set dial


    // Set up the buttons and selectors
    this.oscWaveForm().nativeElement.value = this.proxySettings.waveForm;
    this.portamentoType().nativeElement.value = this.proxySettings.portamentoType;

    SetRadioButtons.set(this.legatoOnOffForm(), this.proxySettings.legatoMode);
    SetRadioButtons.set(this.velocityOnOffForm(), this.proxySettings.velocitySensitive);
    SetRadioButtons.set(this.freqEnveOnOffForm(), this.proxySettings.useFrequencyEnvelope);
    SetRadioButtons.set(this.modSettingsForm(), this.proxySettings.modType);
    SetRadioButtons.set(this.lfoWaveForm(), this.proxySettings.modWaveform);
    SetRadioButtons.set(this.oscModOutputForm(), this.proxySettings.modOutput);
    SetRadioButtons.set(this.oscOutputToForm(), this.proxySettings.output);
  }

  public getSettings(): OscillatorSettings {
    return this.proxySettings;
  }

  protected setFrequency(freq: number) {
    this.proxySettings.frequency = freq;

    this.fmSynthService.tuning(freq, this.oscNumber());
  }

  protected setGain(gain: number) {
    this.proxySettings.gain = gain;
    this.fmSynthService.setGain(gain, this.oscNumber())
  }

  protected pan(pan: number) {
    this.proxySettings.balance = pan;
    // this.oscillators.forEach(osc => {
    //   osc.pan(pan);
    // });
  }

  protected setDetune(detune: number) {
    this.proxySettings.deTune = detune;
    this.fmSynthService.detune(detune, this.oscNumber())
  }

  legatoMode(legatoMode: boolean) {
    this.proxySettings.legatoMode = legatoMode ? onOff.on : onOff.off;
    this.fmSynthService.envelope(this.oscNumber(), envelopePhase.legato, legatoMode ? 1 : 0)
  }

  setVelocitySensitive(velocitySensitive: boolean) {
    this.proxySettings.velocitySensitive = velocitySensitive ? onOff.on : onOff.off;
    this.fmSynthService.setVelocitySensitive(this.oscNumber(), velocitySensitive);
  }

  usePitchEnvelope(useFreqBendEnvelope: boolean) {
    if (useFreqBendEnvelope)
      this.portamento().setValue(0); // Cannot use portamento with frequency envelope

    this.proxySettings.useFrequencyEnvelope = useFreqBendEnvelope ? onOff.on : onOff.off;
    this.fmSynthService.usePitchEnvelope(this.oscNumber(), useFreqBendEnvelope)
  }

  private setWaveForm(value: OscillatorType) {
    this.proxySettings.waveForm = value as oscWaveforms;
    this.fmSynthService.setOutputWaveform(value, this.oscNumber());
  }

  private setPortamentoType(value: PortamentoType) {
    this.proxySettings.portamentoType = value as PortamentoType;
  }

  protected setModOutput(modOutput: oscModOutput) {
    this.fmSynthService.setModOutput(this.oscNumber(), modOutput);
  }

  /**
   * connectToFilters: Connect to a group of filters
   */
  connectToFilters(): void {
    this.fmSynthService.oscillatorOutputToFilter(this.oscNumber(), true);
  }

  connectToRingMod(): boolean {
    this.fmSynthService.oscillatorOutputToFilter(this.oscNumber(), false);
    const ringMod = this.ringMod;
    let ok = false;
    if (ringMod()) {
      this.fmSynthService.disconnect(this.oscNumber());
      ok = true;
      this.fmSynthService.connect(ringMod().signalInput(), this.oscNumber())
    }
    return ok;
  }

  connectToReverb(): boolean {
    this.fmSynthService.oscillatorOutputToFilter(this.oscNumber(), false);
    const reverb = this.reverb();
    let ok = false;
    if (reverb) {
      ok = true;
      this.fmSynthService.disconnect(this.oscNumber());
      this.fmSynthService.connect(reverb.input, this.oscNumber())
    }
    return ok;
  }

  connectToPhaser(): boolean {
    this.fmSynthService.oscillatorOutputToFilter(this.oscNumber(), false);
    const phaser = this.phaser();
    let ok = false;
    if (phaser) {
      ok = true;
      this.fmSynthService.disconnect(this.oscNumber());
      this.fmSynthService.connect(phaser.input, this.oscNumber());
    }
    return ok;
  }

  /**
   * connect: Connect all oscillators in this group to a single node (i.e. gain node).
   * @param node
   */
  connect(node: AudioNode) {
    this.fmSynthService.oscillatorOutputToFilter(this.oscNumber(), false);
    this.fmSynthService.connect(node, this.oscNumber(), 0);
    // this.oscillators.forEach((osc, i) => {
    //   this.oscillators[i].connect(node);
    // });
  }

  disconnect(output: number) {
    this.fmSynthService.oscillatorOutputToFilter(this.oscNumber(), false);
    this.fmSynthService.disconnect(output);
    // this.oscillators.forEach(osc => {
    //   osc.disconnect();
    // })
  }

  private chordProcessorKeyDownCallback: (prevKeys: DeviceKeys, theseKeys: DeviceKeys) => void = (prevKeys: DeviceKeys, theseKeys: DeviceKeys) => {
    //const freq = this.keyToFrequency(prevKeys.keyIndex);
  //  this.fmSynthService.keyDown(this.oscNumber(), theseKeys.deviceIndex, 0x0f);
  }

  protected setPortamento($event: number) {
    this.proxySettings.portamento = $event;
    if ($event > 0) {
      // Can't use frequency bend envelope with portamento
      this.proxySettings.useFrequencyEnvelope = onOff.off;
      SetRadioButtons.set(this.freqEnveOnOffForm(), this.proxySettings.useFrequencyEnvelope);
    }
  }

  midiPitchBend(value: number) {
    // for (let i = 0; i < this.oscillators.length; i++) {
    //   this.oscillators[i].setDetune((value - 0x40) * 5 + this.proxySettings.deTune);
    // }
  }

  midiModLevel(value: number) {
    this.modLevel().setValue(value);
  }

  protected setAttack($event: number) {
    this.proxySettings.adsr.attackTime = $event;
    this.fmSynthService.envelope(this.oscNumber(), envelopePhase.attack, $event)
  }

  protected setDecayTime($event: number) {
    this.proxySettings.adsr.decayTime = $event;
    this.fmSynthService.envelope(this.oscNumber(), envelopePhase.decay, $event)
  }

  protected setSustainLevel($event: number) {
    this.proxySettings.adsr.sustainLevel = $event;
    this.fmSynthService.envelope(this.oscNumber(), envelopePhase.sustain, $event)
  }

  protected setReleaseTime($event: number) {
    this.proxySettings.adsr.releaseTime = $event;
    this.fmSynthService.envelope(this.oscNumber(), envelopePhase.release, $event)
  }

  protected readonly dialStyle = dialStyle;

  protected setFreqAttack($event: number) {
    this.proxySettings.freqBend.attackTime = $event;
    this.fmSynthService.pitchEnvelope(this.oscNumber(), pitchEnvelopePhase.attack, $event);
  }

  protected setFreqAttackLevel($event: number) {
    this.proxySettings.freqBend.attackLevel = $event;
    this.fmSynthService.pitchEnvelope(this.oscNumber(), pitchEnvelopePhase.attackLevel, $event);
  }

  protected setFreqDecayTime($event: number) {
    this.proxySettings.freqBend.decayTime = $event;
    this.fmSynthService.pitchEnvelope(this.oscNumber(), pitchEnvelopePhase.decay, $event);
  }

  protected setFreqSustainLevel($event: number) {
    this.proxySettings.freqBend.sustainLevel = $event;
    this.fmSynthService.pitchEnvelope(this.oscNumber(), pitchEnvelopePhase.sustainLevel, $event);
  }

  protected setFreqReleaseTime($event: number) {
    this.proxySettings.freqBend.releaseTime = $event;
    this.fmSynthService.pitchEnvelope(this.oscNumber(), pitchEnvelopePhase.release, $event);
  }

  protected setFreqReleaseLevel($event: number) {
    this.proxySettings.freqBend.releaseLevel = $event;
    this.fmSynthService.pitchEnvelope(this.oscNumber(), pitchEnvelopePhase.releaseLevel, $event);
  }

  protected setModFrequency(freq: number) {
    this.proxySettings.modFreq = freq;
    this.fmSynthService.setLFOFrequency(this.oscNumber(), freq);
  }

  protected setModLevel($event: number) {
    this.proxySettings.modLevel = $event;
    this.fmSynthService.setLFOLevel(this.oscNumber(), $event);
  }

  private async ctxMenu(e: PointerEvent) {
    this.cd.detectChanges();
    const contextMenu = this.contextMenu().nativeElement;
    contextMenu.style.visibility = "visible";
    const zoomStr = document.body.style.zoom;
    const zoom = parseFloat(zoomStr.substring(0, zoomStr.length - 1)) / 100;
    // @ts-ignore
    const bounds = this.oscPanel().nativeElement.getBoundingClientRect();
    contextMenu.style.top = (e.clientY - bounds.y) / zoom + "px";
    contextMenu.style.left = (e.clientX - bounds.x) / zoom + "px";
  }

  protected contextSelected($event: PointerEvent) {
    const target = $event.target;
    // @ts-ignore
    if (target.value === 1) {
      this.clipboard.config = JSON.stringify(this.proxySettings);
      this.clipboard.source = this.params().settingsId;
      this.clipboard.type = "oscillator";
    }
    // @ts-ignore
    else if (target.value === 2) {
      const settings: OscillatorSettings = JSON.parse(this.clipboard.config as string);
      this.start(this.audioCtx, settings).then();
    }
    const contextMenu = this.contextMenu().nativeElement;
    contextMenu.style.visibility = "hidden";
  }

  ngAfterViewInit(): void {
    window.addEventListener("mousedown", (e) => {
      if (!this.contextMenu().nativeElement.contains(e.target as Node)) {
        const contextMenu = this.contextMenu().nativeElement;
        contextMenu.style.visibility = "hidden";
        const pasteElement = contextMenu.getElementsByTagName('li')[1];
        const style = pasteElement.style;
        if (this.clipboard.source === this.params().settingsId || this.clipboard.config === undefined || this.clipboard.type !== "oscillator") {
          style.fontWeight = "lighter";
          style.fontStyle = "italic";
          style.color = "#b5a8a8";
          style.cursor = "default";
          style.pointerEvents = "none";
        } else {
          style.fontWeight = "bold";
          style.fontStyle = "normal";
          style.color = "black";
          style.cursor = "pointer";
          style.pointerEvents = "all";
        }
      }
    });

    const oscPanel = this.oscPanel().nativeElement;
    oscPanel.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      await this.ctxMenu(e);
    }, false);

    const oscOutForm = this.oscOutputToForm().nativeElement;
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

    const freqEnveOnOffForm = this.freqEnveOnOffForm().nativeElement;
    for (let i = 0; i < freqEnveOnOffForm.elements.length; ++i) {
      freqEnveOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.usePitchEnvelope(value === 'on')
      })
    }
    const legatoOnOffForm = this.legatoOnOffForm().nativeElement;
    for (let i = 0; i < legatoOnOffForm.elements.length; ++i) {
      legatoOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.legatoMode(value === 'on');
      });
    }
    const velocityOnOffForm = this.velocityOnOffForm().nativeElement;
    for (let i = 0; i < velocityOnOffForm.elements.length; ++i) {
      velocityOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.setVelocitySensitive(value === 'on');
      });
    }
    const waveform = this.oscWaveForm().nativeElement;
    waveform.addEventListener('change', ($event) => {
      // @ts-ignore
      const value = $event.target.value as OscillatorType;
      this.setWaveForm(value as OscillatorType);
    });

    const portamentoType = this.portamentoType().nativeElement;
    portamentoType.addEventListener('change', ($event) => {
      // @ts-ignore
      const value = $event.target.value as PortamentoType
      this.setPortamentoType(value as PortamentoType);
    });

    const modSettingsForm = this.modSettingsForm().nativeElement;
    for (let j = 0; j < modSettingsForm.elements.length; ++j) {
      modSettingsForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as modulationType;
        this.fmSynthService.setLFOModType(this.oscNumber(), value);
        this.proxySettings.modType = value;
      });
    }

    const oscModOutputForm = this.oscModOutputForm().nativeElement;
    for (let j = 0; j < oscModOutputForm.elements.length; ++j) {
      oscModOutputForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as oscModOutput;
        this.setModOutput(value);
        this.proxySettings.modOutput = value;
      });
    }

    const modWaveForm = this.lfoWaveForm().nativeElement;
    for (let j = 0; j < modWaveForm.elements.length; ++j) {
      modWaveForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as modWaveforms;
        this.fmSynthService.setLFOWaveform(this.oscNumber(),value);
        this.proxySettings.modWaveform = value as modWaveforms;
      })
    }
  }

  ngOnDestroy(): void {
    this.fmSynthService.shutDown();
  }

  showWaveformSelector = false;

  protected selectWaveform($event: Event) {
    // @ts-ignore
    this.showWaveformSelector = $event.target.checked;
  }

 // protected readonly Oscillator = Oscillator;
  protected readonly WaveTables = WaveTables;
}
