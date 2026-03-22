import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {Phaser} from '../modules/phaser';
import {dialStyle} from '../level-control/levelControlParameters';
import {PhasorSettings} from '../settings/phasor';
import {modWaveforms, onOff, phasorOutputs} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {Cookies} from '../settings/cookies/cookies';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-phaser',
  imports: [
    LevelControlComponent,
    FormsModule
  ],
  templateUrl: './phaser.component.html',
  styleUrl: './phaser.component.scss',
})
export class PhaserComponent implements AfterViewInit, OnDestroy {
  public input!: GainNode;
  private gain!: GainNode;
  phaser!: Phaser;
  proxySettings!: PhasorSettings;
  cookies!: Cookies;
  private audioCtx!: AudioContext;
  protected stages!: number;

  protected readonly dialStyle = dialStyle;
  private lfo!: OscillatorNode;
  private modGain!: GainNode;
  protected readonly minStages: number = 1;
  protected readonly maxStages: number = 61;
  @Input() numberOfOscillators!: number;

  @Output() output: EventEmitter<string> = new EventEmitter();

  @ViewChild('phasorOnOffForm') phasorOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modFreq') modFreq!: LevelControlComponent;
  @ViewChild('modDepth') modLevel!: LevelControlComponent;
  @ViewChild('phase') phase!: LevelControlComponent;
  @ViewChild('level') level!: LevelControlComponent;
  @ViewChild('wetDry') wetDryDial!: LevelControlComponent;
  @ViewChild('lfoWaveForm') lfoWaveForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modOnOffForm') modOnOff!: ElementRef<HTMLFormElement>;
  @ViewChild('feedback') feedback!: LevelControlComponent;

  async setUp(audioCtx: AudioContext, settings: PhasorSettings | null, numberOfNodes: number = 11) {
    this.audioCtx = audioCtx;
    this.lfo = new OscillatorNode(audioCtx);
    this.lfo.type = 'sine';
    this.lfo.start();
    this.input = audioCtx.createGain();
    this.input.gain.value = 1;
    this.modGain = audioCtx.createGain();
    this.modGain.gain.value = 1;
    this.lfo.connect(this.modGain);

    this.gain = audioCtx.createGain();
    this.gain.gain.value = 1;
    this.phaser = new Phaser(audioCtx, this.input, this.gain, numberOfNodes);
    await this.phaser.start();
    this.cookies = new Cookies();

    // Set up LFO default values
    this.modGain.connect(this.phaser.modInput);
    //    this.negModGain.connect(this.phasor.delay2.delayTime);
    this.applySettings(settings);
  }

  // Called after all synth components have been started
  setOutputConnection() {
    SetRadioButtons.set(this.phasorOnOffForm, this.proxySettings.output);
  }

  applySettings(settings: PhasorSettings | null) {
    const cookieName = 'phasor';

    if (!settings) {
      settings = new PhasorSettings();
      const savedSettings = this.cookies.getSettings(cookieName, settings);

      if (Object.keys(savedSettings).length > 0)
        settings = savedSettings as PhasorSettings;  // Use values from cookie
      // Else use default values
    }

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);

    // Set up the dials
    this.modFreq.setValue(settings.lfoFrequency);
    this.modLevel.setValue(settings.modDepth);
    this.phase.setValue(settings.phase);
    this.level.setValue(settings.gain);
    this.wetDryDial.setValue(settings.wetDry === undefined ? 0 : settings.wetDry);
    this.feedback.setValue(settings.feedback);
    this.stages = settings.stages;

    SetRadioButtons.set(this.lfoWaveForm, this.proxySettings.modWaveform);
    SetRadioButtons.set(this.modOnOff, this.proxySettings.modulation);
  }

  public getSettings(): PhasorSettings {
    return this.proxySettings;
  }

  protected setPhase($event: number) {
    this.proxySettings.phase = $event;
    this.phaser.setPhase($event);
  }

  protected setLevel($event: number) {
    this.proxySettings.gain = $event;
    this.phaser.setLevel($event);
  }
  protected setWetDry(wetDry: number) {
    this.proxySettings.wetDry = wetDry;
    this.phaser.setWetDry(wetDry);
  }

  protected setFeedback(feedback: number) {
    this.proxySettings.feedback = feedback;
    this.phaser.setFeedback(feedback);
  }

  protected async setStages(ev: Event) {
    const feedback = this.phaser.feedBack.gain.value;

    // @ts-ignore
    const numberOfNodes = parseInt(ev.target.value);
    if(numberOfNodes > this.maxStages || numberOfNodes < this.minStages) {
      this.stages = this.proxySettings.stages;
    } else {
      this.phaser.destroy();
      this.proxySettings.stages = this.stages = numberOfNodes;

      this.phaser = new Phaser(this.audioCtx, this.input, this.gain, numberOfNodes);
      await this.phaser.start();
      this.modGain.connect(this.phaser.modInput);
      this.phaser.setFeedback(feedback);
      this.setOutputConnection();
      this.setWetDry(this.proxySettings.wetDry);
    }
  }

  protected setModFrequency(freq: number) {
    this.proxySettings.lfoFrequency = freq;
    this.lfo.frequency.value = freq / 3;
  }

  lastLevel: number = 0;

  protected setModLevel($event: number) {
    this.proxySettings.modDepth = $event;
    const level = $event;
    this.lastLevel = level;
    if(this.proxySettings.modulation === onOff.on)
      this.modGain.gain.value = level;
  }

  connect(node: AudioNode) {
    this.gain.connect(node);
  }

  disconnect() {
    this.gain.disconnect();
  }

  ngAfterViewInit(): void {
    const phasorOnOff = this.phasorOnOffForm.nativeElement;
    for (let i = 0; i < phasorOnOff.elements.length; ++i) {
      phasorOnOff.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.output.emit(value);
        this.proxySettings.output = value as phasorOutputs;
      });
    }

    const lfoWaveForm = this.lfoWaveForm.nativeElement;
    for (let j = 0; j < lfoWaveForm.elements.length; ++j) {
      lfoWaveForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as OscillatorType;
        this.lfo.type = value;
        this.proxySettings.modWaveform = value as modWaveforms;
      });
    }
    const modOnOff = this.modOnOff.nativeElement;
    for (let j = 0; j < modOnOff.elements.length; ++j) {
      modOnOff.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as string;
        if (value === 'on')
          this.modGain.gain.value = this.lastLevel;
        else
          this.modGain.gain.value = 0;
        this.proxySettings.modulation = value as onOff;
      });
    }
  }

  ngOnDestroy(): void {
    this.lfo.disconnect();
    this.modGain.disconnect();
    this.disconnect();
    this.phaser.destroy();
  }
}
