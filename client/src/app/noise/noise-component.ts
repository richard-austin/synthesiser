import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  viewChild,
  output,
  input, inject
} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {FilterComponent} from '../filter/filter-component';
import {dialStyle} from '../level-control/levelControlParameters';
import {NoiseSettings} from '../settings/noise';
import {noiseOutputs, onOff} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {Cookies} from '../settings/cookies/cookies';
import {envelopePhase} from '../oscillator/oscillator.component';
import {FmSynthService} from '../services/fm-synth-service';
//import DevicePoolManager from '../util-classes/device-pool-manager';

@Component({
  selector: 'app-noise',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './noise-component.html',
  styleUrl: './noise-component.scss',
})
export class NoiseComponent implements AfterViewInit, OnDestroy {
  private proxySettings!: NoiseSettings;
  private cookies!: Cookies;
  private velocitySensitive: boolean = true;
 // private noisePoolMgr!: DevicePoolManager;

  readonly filters = input.required<FilterComponent | undefined>();
  readonly output = output<string>();

  readonly attack = viewChild.required<LevelControlComponent>('attack');
  readonly decay = viewChild.required<LevelControlComponent>('decay');
  readonly sustain = viewChild.required<LevelControlComponent>('sustain');
  readonly release = viewChild.required<LevelControlComponent>('release');

  readonly noiseTypeForm = viewChild.required<ElementRef<HTMLFormElement>>('noiseTypeForm');
  readonly noiseOutputToForm = viewChild.required<ElementRef<HTMLFormElement>>('noiseOutputToForm');
  readonly gainControl = viewChild.required<LevelControlComponent>('gainControl');
  readonly legatoOnOffForm = viewChild.required<ElementRef<HTMLFormElement>>('legatoOnOffForm');
  readonly velocityOnOffForm = viewChild.required<ElementRef<HTMLFormElement>>('velocity');

  readonly fmSynthService: FmSynthService = inject(FmSynthService);
  private started: boolean;

  constructor() {
    this.started = false;
  }

  async start(audioCtx: AudioContext, settings: NoiseSettings | null) {
    if(!this.started) {
      // for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      //   this.whiteNoise.push(new WhiteNoise(audioCtx));
      //   this.pinkNoise.push(new PinkNoise(audioCtx));
      //   this.brownNoise.push(new BrownNoise(audioCtx));
      //   await this.whiteNoise[i].start();
      //   await this.pinkNoise[i].start();
      //   await this.brownNoise[i].start();
      // }
      this.started = true;
    }
    this.cookies = new Cookies();
    this.applySettings(settings);
  }

  // Called after all synth components have been started
  setOutputConnection() {
    SetRadioButtons.set(this.noiseOutputToForm(), this.proxySettings.output);
  }

  applySettings(settings: NoiseSettings | null) {
    const cookieName = 'noise';
    if (!settings) {
      settings = new NoiseSettings();
      const savedSettings = this.cookies.getSettings(cookieName, settings);

      if (Object.keys(savedSettings).length > 0) {
        // Use values from cookie
        settings = savedSettings as NoiseSettings;
      }
      // else use default settings
    }
    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);
    this.attack().setValue(this.proxySettings.adsr.attackTime);
    this.decay().setValue(this.proxySettings.adsr.decayTime);
    this.sustain().setValue(this.proxySettings.adsr.sustainLevel);
    this.release().setValue(this.proxySettings.adsr.releaseTime);
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

  noiseOff(isOff: boolean) {
    this.proxySettings.output = isOff ? noiseOutputs.off : noiseOutputs.speaker;
    this.fmSynthService.noiseOff(isOff);
  }

  legatoMode(legatoMode: boolean) {
    this.proxySettings.legatoMode = legatoMode ? onOff.on : onOff.off;
   // let source: WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.noiseSource();
    this.fmSynthService.noiseEnvelope(envelopePhase.legato, legatoMode ? 1 : 0)
  }

  useVelocitySensitive(velocitySensitive: boolean) {
    this.proxySettings.velocitySensitive = velocitySensitive ? onOff.on : onOff.off;
    this.velocitySensitive = velocitySensitive;
  }

  protected setAttack($event: number) {
    this.proxySettings.adsr.attackTime = $event;
    this.fmSynthService.noiseEnvelope(envelopePhase.attack, $event);
  }

  protected setDecayTime($event: number) {
    this.proxySettings.adsr.decayTime = $event;
    this.fmSynthService.noiseEnvelope(envelopePhase.decay, $event);
  }

  protected setSustainLevel($event: number) {
    this.proxySettings.adsr.sustainLevel = $event;
    this.fmSynthService.noiseEnvelope(envelopePhase.sustain, $event);
  }

  protected setReleaseTime($event: number) {
    this.proxySettings.adsr.releaseTime = $event;
    this.fmSynthService.noiseEnvelope(envelopePhase.release, $event);
  }

  protected readonly dialStyle = dialStyle;

  ngAfterViewInit(): void {
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
        this.useVelocitySensitive(value === 'on');
      });
    }
  }

  ngOnDestroy(): void {
  }
}
