import {
  AfterViewInit,
  Component,
  ElementRef,
  inject, input,
  InputSignal,
  OnDestroy,
  output,
  OutputEmitterRef, Signal, viewChild
} from '@angular/core';
import {dialStyle} from '../level-control/levelControlParameters';
import {LevelControlComponent} from '../level-control/level-control.component';
import {ReverbComponent} from '../reverb-component/reverb-component';
import {RingModulatorComponent} from '../ring-modulator/ring-modulator-component';
import {PhaserComponent} from '../phaser/phaser.component';
import {filterModType, modWaveforms, onOff} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {FilterSettings} from '../settings/filter';
import {Cookies} from '../settings/cookies/cookies';
import {pitchEnvelopePhase, PortamentoType} from '../oscillator/oscillator.component';
import {FmSynthService} from '../services/fm-synth-service';

@Component({
  selector: 'app-filters',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './filter-component.html',
  styleUrl: './filter-component.scss',
})
export class FilterComponent implements AfterViewInit, OnDestroy {
  protected tuningDivisions = 6;
  private audioCtx!: AudioContext;
  proxySettings!: FilterSettings
  private cookies!: Cookies;

  // One set for oscillator1, one set for oscillator2 and one for the noise source
  private readonly numberOfFilters: number = 1; // TODO: Should be 12 DevicePoolManager.numberOfDevices;

  reverb: InputSignal<ReverbComponent> = input.required<ReverbComponent>();
  ringMod: InputSignal<RingModulatorComponent> = input.required<RingModulatorComponent>();
  phaser: InputSignal<PhaserComponent> = input.required<PhaserComponent>();
  filterNumber: InputSignal<number> = input.required<number>();

  output: OutputEmitterRef<string> = output<string>();
  frequency: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('frequency');
  deTune: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('deTune');
  gain: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('gain');
  qfactor: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('qfactor');

  readonly freqAttack = viewChild.required<LevelControlComponent>('freqAttack');
  readonly freqAttackLevel = viewChild.required<LevelControlComponent>('freqAttackLevel');
  readonly freqDecay = viewChild.required<LevelControlComponent>('freqDecay');
  readonly freqSustain = viewChild.required<LevelControlComponent>('freqSustain');
  readonly freqRelease = viewChild.required<LevelControlComponent>('freqRelease');
  readonly freqReleaseLevel = viewChild.required<LevelControlComponent>('freqReleaseLevel');
  readonly portamento = viewChild.required<LevelControlComponent>('portamento');
  readonly portamentoType = viewChild.required<ElementRef<HTMLSelectElement>>('portamentoType');

  readonly filterOutputTo = viewChild.required<ElementRef<HTMLFormElement>>('filterOutputToForm');

  readonly freqEnveOnOff = viewChild.required<ElementRef<HTMLFormElement>>('freqEnveOnOffForm');
  readonly filterType = viewChild.required<ElementRef<HTMLFormElement>>('filterTypeForm');

  readonly modSettingsForm = viewChild.required<ElementRef<HTMLFormElement>>('modSettingsForm');
  readonly modFreq = viewChild.required<LevelControlComponent>('modFreq');
  readonly modLevel = viewChild.required<LevelControlComponent>('modDepth');
  readonly lfoWaveForm = viewChild.required<ElementRef<HTMLFormElement>>('lfoWaveForm');

  private fmSynthService: FmSynthService = inject(FmSynthService);

  private started = false;

  start(audioCtx: AudioContext, settings: FilterSettings | null): boolean {

    this.audioCtx = audioCtx;
    let ok = false;
    if (this.numberOfFilters && !this.started) {
      this.cookies = new Cookies();
    }
    this.applySettings(settings);
    return ok;
  }

  // Called after all synth components have been started
  setOutputConnection() {
    SetRadioButtons.set(this.filterOutputTo(), this.proxySettings.output);
  }

  applySettings(settings: FilterSettings | null) {
    const cookieName = 'filter' + this.filterNumber();
    if (!settings) {
      settings = new FilterSettings();
      const savedSettings = this.cookies.getSettings(cookieName, settings);

      if (Object.keys(savedSettings).length > 0) {
        // Use values from cookie
        settings = savedSettings as FilterSettings;
      }
    }

    // else use default settings

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);
    if (!this.started) {
      this.started = true;
    }
    this.fmSynthService.filterDetune(this.filterNumber(), this.proxySettings.deTune);
    this.fmSynthService.filterTuning(this.filterNumber(), 10);
    this.fmSynthService.useFilterPitchEnvelope(this.filterNumber(), (this.proxySettings.useFrequencyEnvelope === onOff.off));
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.attack, this.proxySettings.freqBend.attackTime);
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.attackLevel, this.proxySettings.freqBend.attackLevel);
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.decay, this.proxySettings.freqBend.decayTime);
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.sustainLevel, this.proxySettings.freqBend.sustainLevel);
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.release, this.proxySettings.freqBend.releaseTime);
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.releaseLevel, this.proxySettings.freqBend.releaseLevel);

    // this.filters.forEach((filter, i) => {
    //   filter.setFrequency(this.keyToFrequency(i));
    //   filter.setDetune(this.proxySettings.deTune);
    //   filter.setFreqBendEnvelope(this.proxySettings.freqBend);
    //   filter.useFreqBendEnvelope(this.proxySettings.useFrequencyEnvelope === onOff.off);
    //   filter.setType(this.proxySettings.filterType);
    //   filter.clearModulation();  // Remove any preexisting mod settings
    // });

    this.frequency().setValue(this.proxySettings.frequency);  // Set frequency dial initial value.
    this.deTune().setValue(this.proxySettings.deTune);
    this.gain().setValue(this.proxySettings.gain);

    this.portamento().setValue(this.proxySettings.portamento);
    this.portamentoType().nativeElement.value = this.proxySettings.portamentoType;

    this.qfactor().setValue(this.proxySettings.qFactor);

    // Set up default frequency bend e=velope values
    this.freqAttack().setValue(this.proxySettings.freqBend.attackTime);
    this.freqAttackLevel().setValue(this.proxySettings.freqBend.attackLevel);
    this.freqDecay().setValue(this.proxySettings.freqBend.decayTime);
    this.freqSustain().setValue(this.proxySettings.freqBend.sustainLevel);
    this.freqSustain().setValue(this.proxySettings.freqBend.sustainLevel);
    this.freqRelease().setValue(this.proxySettings.freqBend.releaseTime);
    this.freqReleaseLevel().setValue(this.proxySettings.freqBend.releaseLevel);

    // Set up LFO default values
    this.modFreq().setValue(this.proxySettings.modFreq);  // Set dial
    this.modLevel().setValue(this.proxySettings.modLevel);  // Set dial

    // Set up the buttons
//    SetRadioButtons.set(this.filterOutputTo, this.settings.output);
    SetRadioButtons.set(this.filterType(), this.proxySettings.filterType);
    SetRadioButtons.set(this.freqEnveOnOff(), this.proxySettings.useFrequencyEnvelope);
    SetRadioButtons.set(this.modSettingsForm(), this.proxySettings.modType);
    SetRadioButtons.set(this.lfoWaveForm(), this.proxySettings.modWaveform);
  }

  public getSettings(): FilterSettings {
    return this.proxySettings;
  }

  protected setFrequency(freq: number) {
    this.proxySettings.frequency = freq;

    this.fmSynthService.filterTuning(this.filterNumber(), freq);
  }

  protected setGain(gain: number) {
    this.proxySettings.gain = gain;
    this.fmSynthService.setFilterLevel(this.filterNumber(), gain);
  }

  protected setDetune(deTune: number) {
    this.proxySettings.deTune = deTune;
    this.fmSynthService.filterDetune(this.filterNumber(), deTune);
  }

  protected setQFactor(qfactor: number) {
    this.proxySettings.qFactor = qfactor;
    this.fmSynthService.filterQFactor(this.filterNumber(), qfactor);
  }

  useFreqBendEnvelope(useFreqBendEnvelope: boolean) {
    if (useFreqBendEnvelope)
      this.portamento().setValue(0); // Cannot use portamento with frequency envelope
    this.proxySettings.useFrequencyEnvelope = useFreqBendEnvelope ? onOff.on : onOff.off;

    this.fmSynthService.useFilterPitchEnvelope(this.filterNumber(), useFreqBendEnvelope);
  }

  private setFilterType(value: number) {
    this.proxySettings.filterType = value;
    this.fmSynthService.setFilterMorphMode(this.filterNumber(), value);
    // for (let i = 0; i < this.numberOfFilters; ++i) {
    //   this.filters[i].setType(value);
    // }
  }

  private setPortamentoType(value: PortamentoType) {
    this.proxySettings.portamentoType = value as PortamentoType;
  }


  /**
   * connect: Connect all filters in this group to a single node (i.e. gain node).
   * @param node
   */
  connect(node: AudioNode) {
    this.fmSynthService.connectFilter(node, this.filterNumber())
  }

  connectToRingMod(): boolean {
    const ringMod = this.ringMod();
    let ok = false;
    if (ringMod) {
      ok = true;
      this.fmSynthService.connectFilter(ringMod.signalInput(), this.filterNumber());
    }
    return ok;
  }

  connectToPhasor(): boolean {
    const phaser = this.phaser;
    let ok = false;
    if (phaser()) {
      ok = true;
      this.fmSynthService.connectFilter(phaser().input, this.filterNumber());
    }
    return ok;
  }

  connectToReverb(): boolean {
    const reverb = this.reverb();
    let ok = false;
    if (reverb) {
      ok = true;
      this.fmSynthService.connectFilter(reverb.input, this.filterNumber());
     }
    return ok;
  }

  disconnect() {
    this.fmSynthService.disconnectFilter(this.filterNumber());
  }

  protected setPortamento($event: number) {
    this.proxySettings.portamento = $event;
    if ($event > 0) {
      // Can't use frequency bend envelope with portamento
      this.proxySettings.useFrequencyEnvelope = onOff.off;
      SetRadioButtons.set(this.freqEnveOnOff(), this.proxySettings.useFrequencyEnvelope);
    }
  }

  midiPitchBend(value: number) {
    this.fmSynthService.filterDetune(this.filterNumber(), (value - 0x40) * 5 + this.proxySettings.deTune);
  }

  midiModLevel(value: number) {
    this.modLevel().setValue(value);
  }

  protected readonly dialStyle = dialStyle;

  protected setFreqAttack($event: number) {
    this.proxySettings.freqBend.attackTime = $event;
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.attack, $event);
  }

  protected setFreqAttackLevel($event: number) {
    this.proxySettings.freqBend.attackLevel = $event;
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.attackLevel, $event);
  }

  protected setFreqDecayTime($event: number) {
    this.proxySettings.freqBend.decayTime = $event;
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.decay, $event);
  }

  protected setFreqSustainLevel($event: number) {
    this.proxySettings.freqBend.sustainLevel = $event;
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.sustainLevel, $event);
  }

  protected setFreqReleaseTime($event: number) {
    this.proxySettings.freqBend.releaseTime = $event;
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.release, $event);
  }

  protected setFreqReleaseLevel($event: number) {
    this.proxySettings.freqBend.releaseLevel = $event;
    this.fmSynthService.filterPitchEnvelope(this.filterNumber(), pitchEnvelopePhase.releaseLevel, $event);
  }

  protected setModFrequency(freq: number) {
    this.proxySettings.modFreq = freq;
    this.fmSynthService.setFilterLFOFrequency(this.filterNumber(), freq);
  }

  protected setModLevel($event: number) {
    this.proxySettings.modLevel = $event;
    this.fmSynthService.setFilterLFOLevel(this.filterNumber(), $event);
  }

  protected setModType(type: filterModType) {
    this.proxySettings.modType = type;
    this.fmSynthService.setFilterLFOModType(this.filterNumber(), type);
  }


  ngAfterViewInit(): void {
    // this.devicePoolManagerService.notifyKeydown[this.filterNumber()] = (keys: DeviceKeys) => {
    //   this.deviceKeyDown(keys);
    // }
    //
    // this.devicePoolManagerService.notifyKeyup[this.filterNumber()] = (keys: DeviceKeys) => {
    //   this.deviceKeyUp(keys);
    // }

    const filterOutForm = this.filterOutputTo().nativeElement;
    for (let i = 0; i < filterOutForm.elements.length; ++i) {
      filterOutForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.output.emit(value);
        this.proxySettings.output = value;
      });
    }
    const freqEnveOnOffForm = this.freqEnveOnOff().nativeElement;
    for (let i = 0; i < freqEnveOnOffForm.elements.length; ++i) {
      freqEnveOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.useFreqBendEnvelope(value === 'on')
      })
    }
    const filterType = this.filterType().nativeElement;
    for (let i = 0; i < filterType.elements.length; ++i) {
      filterType.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.setFilterType(value);
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
          this.setModType(value);
        });
      }

      const modWaveForm = this.lfoWaveForm().nativeElement;
      for (let j = 0; j < modWaveForm.elements.length; ++j) {
        modWaveForm.elements[j].addEventListener('change', ($event) => {
          // @ts-ignore
          const value = $event.target.value;
          this.fmSynthService.setFilterLFOWaveform(this.filterNumber(), value);
          this.proxySettings.modWaveform = value as modWaveforms;
        })
      }
    }
  }

  ngOnDestroy(): void {
    // for (let i = 0; i < this.filters.length; i++) {
    //
    //   this.filters[i].destroy();
    //   // @ts-ignore
    //   this.filters[i] = undefined;
    // }
  }
}
