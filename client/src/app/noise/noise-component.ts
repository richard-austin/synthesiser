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
import {WhiteNoise} from '../modules/noise/white-noise';
import {PinkNoise} from '../modules/noise/pink-noise';
import {BrownNoise} from '../modules/noise/brown-noise';
import {LevelControlComponent} from '../level-control/level-control.component';
import {FilterComponent} from '../filter/filter-component';
import {dialStyle} from '../level-control/levelControlParameters';
import {NoiseSettings} from '../settings/noise';
import {noiseOutputs, onOff} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {Cookies} from '../settings/cookies/cookies';
import DevicePoolManager from '../util-classes/device-pool-manager';
import {DeviceKeys, DevicePoolManagerService} from '../services/device-pool-manager-service';

@Component({
  selector: 'app-noise',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './noise-component.html',
  styleUrl: './noise-component.scss',
})
export class NoiseComponent implements AfterViewInit, OnDestroy {
  private whiteNoise: WhiteNoise[] = [];
  private pinkNoise: PinkNoise[] = [];
  private brownNoise: BrownNoise[] = [];
  private proxySettings!: NoiseSettings;
  private cookies!: Cookies;
  private velocitySensitive: boolean = true;
  private noisePoolMgr!: DevicePoolManager;

  @Input() filters!: FilterComponent;
  @Output() output = new EventEmitter<string>();

  @ViewChild('attack') attack!: LevelControlComponent;
  @ViewChild('decay') decay!: LevelControlComponent;
  @ViewChild('sustain') sustain!: LevelControlComponent;
  @ViewChild('release') release!: LevelControlComponent;

  @ViewChild('noiseTypeForm') noiseTypeForm!: ElementRef<HTMLFormElement>;
  @ViewChild('noiseOutputToForm') noiseOutputToForm!: ElementRef<HTMLFormElement>;
  @ViewChild('gainControl') gainControl!: LevelControlComponent;
  @ViewChild('amplitudeEnvelopeOnOffForm') amplitudeEnvelopeOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('velocity') velocityOnOffForm!: ElementRef<HTMLFormElement>;

  private devicePoolManagerService = inject(DevicePoolManagerService);

  constructor() {
  }

  async start(audioCtx: AudioContext, settings: NoiseSettings | null) {
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.whiteNoise.push(new WhiteNoise(audioCtx));
      this.pinkNoise.push(new PinkNoise(audioCtx));
      this.brownNoise.push(new BrownNoise(audioCtx));
      await this.whiteNoise[i].start();
      await this.pinkNoise[i].start();
      await this.brownNoise[i].start();
    }
    this.cookies = new Cookies();
    this.applySettings(settings);
  }

  // Called after all synth components have been started
  setOutputConnection() {
    SetRadioButtons.set(this.noiseOutputToForm, this.proxySettings.output);
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
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.whiteNoise[i].setGain(settings.gain);
      this.whiteNoise[i].setAmplitudeEnvelope(settings.adsr);
      this.whiteNoise[i].useAmplitudeEnvelope = settings.useAmplitudeEnvelope === onOff.on;
      this.pinkNoise[i].setGain(settings.gain);
      this.pinkNoise[i].setAmplitudeEnvelope(settings.adsr);
      this.pinkNoise[i].useAmplitudeEnvelope = settings.useAmplitudeEnvelope === onOff.on;
      this.brownNoise[i].setGain(settings.gain);
      this.brownNoise[i].setAmplitudeEnvelope(settings.adsr);
      this.brownNoise[i].useAmplitudeEnvelope = settings.useAmplitudeEnvelope === onOff.on;
    }
    let source: WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.noiseSource();
    this.noisePoolMgr = new DevicePoolManager(source, this.proxySettings);

    this.attack.setValue(this.proxySettings.adsr.attackTime);
    this.decay.setValue(this.proxySettings.adsr.decayTime);
    this.sustain.setValue(this.proxySettings.adsr.sustainLevel);
    this.release.setValue(this.proxySettings.adsr.releaseTime);
    this.gainControl.setValue(settings.gain);

    //  SetRadioButtons.set(this.noiseOutputToForm, this.settings.output);
    SetRadioButtons.set(this.noiseTypeForm, this.proxySettings.type);
    SetRadioButtons.set(this.amplitudeEnvelopeOnOffForm, this.proxySettings.useAmplitudeEnvelope);
    SetRadioButtons.set(this.velocityOnOffForm, this.proxySettings.velocitySensitive);
  }

  public getSettings(): NoiseSettings {
    return this.proxySettings;
  }

  protected setGain(gain: number) {
    this.proxySettings.gain = gain;
    const noiseType = this.proxySettings.type;

    for (let i = 0; i < DevicePoolManager.numberOfDevices; i++) {
      switch (noiseType) {
        case 'white':
          this.whiteNoise[i].setGain(gain);
          break;
        case 'pink':
          this.pinkNoise[i].setGain(gain);
          break;
        case 'brown':
          this.brownNoise[i].setGain(gain);
          break;
      }
    }
  }

  private setNoiseType(noiseType: any) {
    this.proxySettings.type = noiseType;
    const gain = this.proxySettings.gain;

    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.whiteNoise[i].setGain(0);
      this.pinkNoise[i].setGain(0);
      this.brownNoise[i].setGain(0);
    }
    const source: WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.noiseSource();
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      source[i].setGain(gain);
      source[i].useAmplitudeEnvelope = this.proxySettings.useAmplitudeEnvelope == onOff.on;
    }
    this.noisePoolMgr.updateDevices(this.noiseSource())
  }

  connect(node: AudioNode) {
    this.proxySettings.output = noiseOutputs.speaker;
    this.whiteNoise[0].connect(node);
    this.pinkNoise[0].connect(node);
    this.brownNoise[0].connect(node);
  }

  /**
   * connectToFilters: Connect to a group of filters
   */
  connectToFilters(): void {
    this.proxySettings.output = noiseOutputs.filter;
    const filters = this.filters?.filters;
    for (let i = 0; i < DevicePoolManager.numberOfDevices; i++) {
      this.whiteNoise[i].connect(filters[i].filter);
      this.pinkNoise[i].connect(filters[i].filter);
      this.brownNoise[i].connect(filters[i].filter);
    }
  }

  disconnect() {
    this.proxySettings.output = noiseOutputs.off;
    for (let i = 0; i < DevicePoolManager.numberOfDevices; i++) {
      this.whiteNoise[i].disconnect();
      this.pinkNoise[i].disconnect();
      this.brownNoise[i].disconnect();
    }
  }

  private noiseSource(): WhiteNoise[] | PinkNoise[] | BrownNoise[] {
    let source: WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.whiteNoise;
    switch (this.proxySettings.type) {
      case 'white':
        source = this.whiteNoise;
        break;
      case 'pink':
        source = this.pinkNoise;
        break;
      case 'brown':
        source = this.brownNoise;
        break;
    }
    return source;
  }

  useAmplitudeEnvelope(useAmplitudeEnvelope: boolean) {
    this.proxySettings.useAmplitudeEnvelope = useAmplitudeEnvelope ? onOff.on : onOff.off;
    let source: WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.noiseSource();
    for (let i = 0; i < DevicePoolManager.numberOfDevices; i++) {
      source[i].useAmplitudeEnvelope = useAmplitudeEnvelope;
    }
  }

  useVelocitySensitive(velocitySensitive: boolean) {
    this.proxySettings.velocitySensitive = velocitySensitive ? onOff.on : onOff.off;
    this.velocitySensitive = velocitySensitive;
  }

  keyDown(keyIndex: number, velocity: number) {
    if (keyIndex >= 0) {
      if (this.proxySettings.output === noiseOutputs.speaker)
        keyIndex = 0;  // Wired straight to the output, so we only use a single channel to avoid overload
      if (!this.velocitySensitive)
        velocity = 0x7f;
      const keys: DeviceKeys | undefined = this.noisePoolMgr.keyDown(keyIndex, velocity);
      if (keys) {
        this.devicePoolManagerService.keyDownNoise(keys);  // Trigger appropriate filter bank
      }
    }
  }

  keyUp(keyIndex: number) {
    if (keyIndex >= 0) {
      if (this.proxySettings.output === noiseOutputs.speaker)
        keyIndex = 0; // Wired straight to the output, so we only use a single channel to avoid overload
      //source[keyIndex].keyUp();

      const keys: DeviceKeys | undefined = this.noisePoolMgr.keyUp(keyIndex);
      if (keys)
        this.devicePoolManagerService.keyUpNoise(keys);  // Trigger appropriate filter bank
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

  ngAfterViewInit(): void {
    const noiseOutputToForm = this.noiseOutputToForm.nativeElement;
    for (let i = 0; i < noiseOutputToForm.elements.length; ++i) {
      noiseOutputToForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.output.emit(value);
        this.proxySettings.output = value;
      });
    }

    const noiseTypeForm = this.noiseTypeForm.nativeElement;
    for (let i = 0; i < noiseTypeForm.elements.length; ++i) {
      noiseTypeForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.setNoiseType(value);
        this.proxySettings.type = value;
      });
    }

    const amplitudeEnvelopeOnOffForm = this.amplitudeEnvelopeOnOffForm.nativeElement;
    for (let i = 0; i < amplitudeEnvelopeOnOffForm.elements.length; ++i) {
      amplitudeEnvelopeOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.useAmplitudeEnvelope(value === 'on');
        this.proxySettings.useAmplitudeEnvelope = value;
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
  }

  ngOnDestroy(): void {
    WhiteNoise.theNode = PinkNoise.theNode = BrownNoise.theNode = undefined;
    for (let i = 0; i < this.whiteNoise.length; i++) {
      // @ts-ignore
      this.whiteNoise[i] = null;
    }
    for (let i = 0; i < this.pinkNoise.length; i++) {
      // @ts-ignore
      this.pinkNoise[i] = null;
    }
    for (let i = 0; i < this.brownNoise.length; i++) {
      // @ts-ignore
      this.brownNoise[i] = null;
    }
  }
}
