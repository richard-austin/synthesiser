import {AfterViewInit, Component, ElementRef, OnDestroy, viewChild, output, inject} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {PhasorSettings} from '../settings/phasor';
import {modWaveforms, onOff, phasorOutputs} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {Cookies} from '../settings/cookies/cookies';
import {FormsModule} from '@angular/forms';
import {NgClass} from '@angular/common';
import {FmSynthService} from '../services/fm-synth-service';

@Component({
  selector: 'app-phaser',
  imports: [
    LevelControlComponent,
    FormsModule,
    NgClass
  ],
  templateUrl: './phaser.component.html',
  styleUrl: './phaser.component.scss',
})
export class PhaserComponent implements AfterViewInit, OnDestroy {
  proxySettings!: PhasorSettings;
  cookies!: Cookies;
  protected stages!: number;

  protected readonly dialStyle = dialStyle;
  protected readonly minStages: number = 1;
  protected readonly maxStages: number = 61;
  protected readonly isFirefox: boolean;

  private started = false;
  readonly output = output<string>();

  readonly phasorOnOffForm = viewChild.required<ElementRef<HTMLFormElement>>('phasorOnOffForm');
  readonly modFreq = viewChild.required<LevelControlComponent>('modFreq');
  readonly modLevel = viewChild.required<LevelControlComponent>('modDepth');
  readonly frequency = viewChild.required<LevelControlComponent>('frequency');
  readonly bandwidth = viewChild.required<LevelControlComponent>('qFactor');
  readonly level = viewChild.required<LevelControlComponent>('level');
  readonly wetDryDial = viewChild.required<LevelControlComponent>('wetDry');
  readonly lfoWaveForm = viewChild.required<ElementRef<HTMLFormElement>>('lfoWaveForm');
  readonly modOnOff = viewChild.required<ElementRef<HTMLFormElement>>('modOnOffForm');
  readonly feedback = viewChild.required<LevelControlComponent>('feedback');

  readonly fmSynthService: FmSynthService = inject(FmSynthService);

  constructor() {
    this.isFirefox = navigator.userAgent.indexOf('Firefox') != -1;
  }

  async setUp(settings: PhasorSettings | null) {
    this.cookies = new Cookies();

    await this.applySettings(settings);
  }

  // Called after all synth components have been started
  setOutputConnection() {
    SetRadioButtons.set(this.phasorOnOffForm(), this.proxySettings.output);
  }

  async applySettings(settings: PhasorSettings | null) {
    const cookieName = 'phasor';

    if (!settings) {
      settings = new PhasorSettings();
      const savedSettings = this.cookies.getSettings(cookieName, settings);

      if (Object.keys(savedSettings).length > 0)
        settings = savedSettings as PhasorSettings;  // Use values from cookie
      // Else use default values
    }

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);

    // Set up LFO default values
    // this.modGain.connect(this.phaser.modInput);
    // this.modGain2.connect(this.phaser2.modInput);
    this.started = true;

    // Set up the dials
    this.modFreq().setValue(settings.lfoFrequency);
    this.modLevel().setValue(settings.modDepth);
    this.frequency().setValue(settings.phase);
    this.bandwidth().setValue(settings.bandwidth ? settings.bandwidth : -0.25);
    this.level().setValue(settings.gain);
    this.wetDryDial().setValue(settings.wetDry === undefined ? 0 : settings.wetDry);
    this.feedback().setValue(settings.feedback);
    this.stages = settings.stages;

    SetRadioButtons.set(this.lfoWaveForm(), this.proxySettings.modWaveform);
    SetRadioButtons.set(this.modOnOff(), this.proxySettings.modulation);
  }

  public getSettings(): PhasorSettings {
    return this.proxySettings;
  }

  protected setFrequency(frequency: number) {
    this.proxySettings.phase = frequency;
    this.fmSynthService.phaserSetFrequency(frequency);
  }

  protected setQFactor(q: number) {
    this.proxySettings.bandwidth = q;
    this.fmSynthService.phaserSetQ(q);
  }

  protected setLevel($event: number) {
    this.proxySettings.gain = $event;
    this.fmSynthService.phaserSetLevel($event);
  }

  protected setWetDry(wetDry: number) {
    this.proxySettings.wetDry = wetDry;
    this.fmSynthService.phaserSetWetDry(wetDry);
  }

  protected setFeedback(feedback: number) {
    this.proxySettings.feedback = feedback;
    this.fmSynthService.phaserSetFeedback(feedback);
  }

  protected async setStages(ev: Event) {
    // @ts-ignore
    const numberOfNodes = parseInt(ev.target.value);
    this.proxySettings.stages = numberOfNodes;
     this.fmSynthService.phaserSetStages(numberOfNodes);
  }

  protected setModFrequency(freq: number) {
    this.proxySettings.lfoFrequency = freq;
    this.fmSynthService.setPhaserLFOFrequency(freq);
  }

  lastLevel: number = 0;

  protected setModLevel($event: number) {
    this.proxySettings.modDepth = $event;
    this.lastLevel = $event;
    this.fmSynthService.setPhaserLFOLevel($event);
  }

  ngAfterViewInit(): void {
    const phasorOnOff = this.phasorOnOffForm().nativeElement;
    for (let i = 0; i < phasorOnOff.elements.length; ++i) {
      phasorOnOff.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.output.emit(value);
        this.proxySettings.output = value as phasorOutputs;
      });
    }

    const lfoWaveForm = this.lfoWaveForm().nativeElement;
    for (let j = 0; j < lfoWaveForm.elements.length; ++j) {
      lfoWaveForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as OscillatorType;
        this.fmSynthService.setPhaserLFOWaveform(value as modWaveforms);
        this.proxySettings.modWaveform = value as modWaveforms;
      });
    }
    const modOnOff = this.modOnOff().nativeElement;
    for (let j = 0; j < modOnOff.elements.length; ++j) {
      modOnOff.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value: onOff = $event.target.value as onOff;
          this.fmSynthService.setPhaserLFOModType(value)
        this.proxySettings.modulation = value;
      });
    }
  }

  ngOnDestroy(): void {
    //this.fmSynthService.phaserDestroy();
  }
}
