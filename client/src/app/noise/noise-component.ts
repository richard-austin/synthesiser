import {
  Component,
  ElementRef,
  viewChild,
  output,
  input, inject, signal, afterNextRender
} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {FilterComponent} from '../filter/filter-component';
import {dialStyle} from '../level-control/levelControlParameters';
import {NoiseSettings} from '../settings/noise';
import {noiseOutputs, onOff} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {envelopePhase} from '../oscillator/oscillator.component';
import {FmSynthService} from '../services/fm-synth-service';
import {IndexedDBService} from '../services/indexed-db-service';
import {EnvelopeGraphComponent} from '../envelope-graph/envelope-graph-component';
import {ADSRValues} from '../util-classes/adsrvalues';
import {timer} from 'rxjs';

@Component({
  selector: 'app-noise',
  imports: [
    LevelControlComponent,
    EnvelopeGraphComponent
  ],
  templateUrl: './noise-component.html',
  styleUrl: './noise-component.scss',
})
export class NoiseComponent {
  protected proxySettings!: NoiseSettings;

 // private noisePoolMgr!: DevicePoolManager;

  readonly filters = input.required<FilterComponent | undefined>();
  readonly output = output<string>();

  readonly attack = viewChild.required<LevelControlComponent>('attack');
  readonly decay = viewChild.required<LevelControlComponent>('decay');
  readonly sustain = viewChild.required<LevelControlComponent>('sustain');
  readonly release = viewChild.required<LevelControlComponent>('release');
  envelopeSignal  = signal<ADSRValues>(new ADSRValues(0,0,0,0, true));
  envelopeGraphicsEnabled = signal<boolean>(false);
  graphPositionOffset = signal<{xOffset:number, yOffset:number}>({xOffset:0,yOffset: 0});

  readonly noiseTypeForm = viewChild.required<ElementRef<HTMLFormElement>>('noiseTypeForm');
  readonly noiseOutputToForm = viewChild.required<ElementRef<HTMLFormElement>>('noiseOutputToForm');
  readonly gainControl = viewChild.required<LevelControlComponent>('gainControl');
  readonly legatoOnOffForm = viewChild.required<ElementRef<HTMLFormElement>>('legatoOnOffForm');
  readonly velocityOnOffForm = viewChild.required<ElementRef<HTMLFormElement>>('velocity');

  private readonly indexedDBService: IndexedDBService = inject(IndexedDBService);
  readonly fmSynthService: FmSynthService = inject(FmSynthService);

  constructor() {
    afterNextRender({
      write: () => {
        const noiseOutputToForm = this.noiseOutputToForm().nativeElement;
        for (let i = 0; i < noiseOutputToForm.elements.length; ++i) {
          noiseOutputToForm.elements[i].addEventListener('change', ($event) => {
            // @ts-ignore
            const value = $event.target.value;
            this.output.emit(value);
            this.proxySettings.output = value;
          });
        }

        const noiseTypeForm = this.noiseTypeForm().nativeElement;
        for (let i = 0; i < noiseTypeForm.elements.length; ++i) {
          noiseTypeForm.elements[i].addEventListener('change', ($event) => {
            // @ts-ignore
            const value = $event.target.value;
            this.setNoiseType(value);
            this.proxySettings.type = value;
          });
        }

        const legatoOnOffForm = this.legatoOnOffForm().nativeElement;
        for (let i = 0; i < legatoOnOffForm.elements.length; ++i) {
          legatoOnOffForm.elements[i].addEventListener('change', ($event) => {
            // @ts-ignore
            const value = $event.target.value;
            this.legatoMode(value === 'on');
            this.proxySettings.legatoMode = value;
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
      }
    })
  }

  async start(audioCtx: AudioContext, settings: NoiseSettings | null) {
    await this.applySettings(settings);
    timer(0).subscribe(() => this.envelopeGraphicsEnabled.set(true));
  }

  // Called after all synth components have been started
  setOutputConnection() {
    SetRadioButtons.set(this.noiseOutputToForm(), this.proxySettings.output);
  }

  async applySettings(settings: NoiseSettings | null) {
    this.envelopeGraphicsEnabled.set(false);
    const objectName = 'noise';
    if (!settings) {
      settings = new NoiseSettings();
      const savedSettings = await this.indexedDBService.getSynthObject(objectName);

      if (savedSettings && Object.keys(savedSettings).length > 0) {
        // Use values from cookie
        settings = savedSettings as NoiseSettings;
      }
      // else use default settings
    }
    this.proxySettings = this.indexedDBService.getSettingsProxy(settings, objectName);
    this.attack().setValue(this.proxySettings.adsr.attackTime);
    this.decay().setValue(this.proxySettings.adsr.decayTime);
    this.sustain().setValue(this.proxySettings.adsr.sustainLevel);
    this.release().setValue(this.proxySettings.adsr.releaseTime);
    this.envelopeSignal.set(this.proxySettings.adsr);
    this.gainControl().setValue(settings.gain);

    //  SetRadioButtons.set(this.noiseOutputToForm, this.settings.output);
    SetRadioButtons.set(this.noiseTypeForm(), this.proxySettings.type);
    SetRadioButtons.set(this.legatoOnOffForm(), this.proxySettings.legatoMode);
    SetRadioButtons.set(this.velocityOnOffForm(), this.proxySettings.velocitySensitive);
  }

  public getSettings(): NoiseSettings {
    return this.proxySettings;
  }

  protected setGain(gain: number) {
    this.proxySettings.gain = gain;
    this.fmSynthService.setNoiseGain(gain);
  }

  private setNoiseType(noiseType: any) {
    this.proxySettings.type = noiseType;
    this.fmSynthService.setNoiseType(noiseType);
  }

   /**
   * connectToFilters: Connect to a group of filters
   */
  connectToFilters(): void {
    this.proxySettings.output = noiseOutputs.filter;
    this.fmSynthService.noiseConnectToFilter();
   }

  connectToPhaser() {
    this.proxySettings.output = noiseOutputs.phaser;
    this.fmSynthService.noiseConnectToPhaser();
  }

  noiseOff(isOff: boolean) {
    this.proxySettings.output = isOff ? noiseOutputs.off : noiseOutputs.speaker;
    this.fmSynthService.noiseOff(isOff);
  }

  legatoMode(legatoMode: boolean) {
    this.proxySettings.legatoMode = legatoMode ? onOff.on : onOff.off;
   // let source: WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.noiseSource();
    this.fmSynthService.noiseEnvelope(envelopePhase.legato, legatoMode ? 1 : 0)
  }

  setVelocitySensitive(velocitySensitive: boolean) {
    this.proxySettings.velocitySensitive = velocitySensitive ? onOff.on : onOff.off;
    this.fmSynthService.setNoiseVelocitySensitive(velocitySensitive);
  }

  private setEnvelopeSig(adsr: ADSRValues) {
    this.graphPositionOffset.set({xOffset: -530, yOffset: -550});
    this.envelopeSignal?.set(new ADSRValues(adsr.attackTime, adsr.decayTime, adsr.sustainLevel, adsr.releaseTime, adsr.isExponential));
  }

  protected setAttack($event: number) {
    this.proxySettings.adsr.attackTime = $event;
    this.setEnvelopeSig(this.proxySettings.adsr);
    this.fmSynthService.noiseEnvelope(envelopePhase.attack, $event);
  }

  protected setDecayTime($event: number) {
    this.proxySettings.adsr.decayTime = $event;
    this.setEnvelopeSig(this.proxySettings.adsr);
    this.fmSynthService.noiseEnvelope(envelopePhase.decay, $event);
  }

  protected setSustainLevel($event: number) {
    this.proxySettings.adsr.sustainLevel = $event;
    this.setEnvelopeSig(this.proxySettings.adsr);
    this.fmSynthService.noiseEnvelope(envelopePhase.sustain, $event);
  }

  protected setReleaseTime($event: number) {
    this.proxySettings.adsr.releaseTime = $event;
    this.setEnvelopeSig(this.proxySettings.adsr);
    this.fmSynthService.noiseEnvelope(envelopePhase.release, $event);
  }

  protected readonly dialStyle = dialStyle;
}
