import {AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild} from '@angular/core';
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
  private gain2!: GainNode;
  private panner!: StereoPannerNode;
  private panner2!: StereoPannerNode;
  phaser!: Phaser;
  phaser2!: Phaser;
  proxySettings!: PhasorSettings;
  cookies!: Cookies;
  private audioCtx!: AudioContext;
  protected stages!: number;

  protected readonly dialStyle = dialStyle;
  private lfo!: OscillatorNode;
  private lfo2!: OscillatorNode;
  private modGain!: GainNode;
  private modGain2!: GainNode;
  protected readonly minStages: number = 1;
  protected readonly maxStages: number = 61;
  @Output() output: EventEmitter<string> = new EventEmitter();

  @ViewChild('phasorOnOffForm') phasorOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modFreq') modFreq!: LevelControlComponent;
  @ViewChild('modDepth') modLevel!: LevelControlComponent;
  @ViewChild('frequency') frequency!: LevelControlComponent;
  @ViewChild('bandwidth') bandwidth!: LevelControlComponent;
  @ViewChild('level') level!: LevelControlComponent;
  @ViewChild('wetDry') wetDryDial!: LevelControlComponent;
  @ViewChild('lfoWaveForm') lfoWaveForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modOnOffForm') modOnOff!: ElementRef<HTMLFormElement>;
  @ViewChild('feedback') feedback!: LevelControlComponent;

  async setUp(audioCtx: AudioContext, settings: PhasorSettings | null) {
    this.audioCtx = audioCtx;
    this.lfo = new OscillatorNode(audioCtx);
    this.lfo.type = "sine";
    this.lfo.start();
    this.lfo2 = new OscillatorNode(audioCtx);
    this.lfo2.type = "sine"
    this.lfo2.start();
    this.input = audioCtx.createGain();
    this.input.gain.value = 1;
    this.modGain = audioCtx.createGain();
    this.modGain.gain.value = 1;
    this.modGain2 = audioCtx.createGain();
    this.modGain2.gain.value = 1;
    this.lfo.connect(this.modGain);
    this.lfo2.connect(this.modGain2);
    this.gain = audioCtx.createGain();
    this.gain.gain.value = 1;
    this.gain2 = new GainNode(audioCtx);
    this.gain2.gain.value = 1;
    this.panner = audioCtx.createStereoPanner();
    this.panner.connect(this.gain);
    this.panner.pan.value = -1;  // Left channel
    this.panner2 = audioCtx.createStereoPanner();
    this.panner2.connect(this.gain);
    this.panner2.pan.value = 1;  // Right channel
    this.cookies = new Cookies();

    await this.applySettings(settings);
  }

  // Called after all synth components have been started
  setOutputConnection() {
    SetRadioButtons.set(this.phasorOnOffForm, this.proxySettings.output);
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

    this.phaser = new Phaser(this.audioCtx, this.input, this.panner, settings.stages);
    this.phaser2 = new Phaser(this.audioCtx, this.input, this.panner2, settings.stages);
    await this.phaser.start();
    await this.phaser2.start();
    // Set up LFO default values
    this.modGain.connect(this.phaser.modInput);
    this.modGain2.connect(this.phaser2.modInput);

    // Set up the dials
    this.modFreq.setValue(settings.lfoFrequency);
    this.modLevel.setValue(settings.modDepth);
    this.frequency.setValue(settings.phase);
    this.bandwidth.setValue(settings.bandwidth ? settings.bandwidth : -0.25);
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

  protected setFrequency(frequency: number) {
    this.proxySettings.phase = frequency;
    this.phaser.setFrequency(frequency);
    this.phaser2.setFrequency(frequency);
  }

  protected setBandwidth(bandwidth: number) {
    this.proxySettings.bandwidth = bandwidth;
    this.phaser.setBandWidth(bandwidth);
    this.phaser2.setBandWidth(bandwidth);
  }
  protected setLevel($event: number) {
    this.proxySettings.gain = $event;
    this.phaser.setLevel($event);
    this.phaser2.setLevel($event);
  }

  protected setWetDry(wetDry: number) {
    this.proxySettings.wetDry = wetDry;
    this.phaser.setWetDry(wetDry);
    this.phaser2.setWetDry(wetDry);
  }

  protected setFeedback(feedback: number) {
    this.proxySettings.feedback = feedback;
    this.phaser.setFeedback(feedback);
    this.phaser2.setFeedback(feedback);
  }

  protected async setStages(ev: Event) {
    // @ts-ignore
    const numberOfNodes = parseInt(ev.target.value);
    if (numberOfNodes > this.maxStages || numberOfNodes < this.minStages) {
      this.stages = this.proxySettings.stages;
    } else {
      this.phaser.destroy();
      this.phaser2.destroy();
      this.proxySettings.stages = this.stages = numberOfNodes;

      this.phaser = new Phaser(this.audioCtx, this.input, this.panner, numberOfNodes);
      this.phaser2 = new Phaser(this.audioCtx, this.input, this.panner2, numberOfNodes);
      await this.phaser.start();
      await this.phaser2.start();
      const gain = this.proxySettings.gain;
      this.phaser.setLevel(gain);
      this.phaser2.setLevel(gain);
      this.modGain.connect(this.phaser.modInput);
      this.modGain2.connect(this.phaser2.modInput);
      const feedback = this.proxySettings.feedback;
      this.phaser.setFeedback(feedback);
      this.phaser2.setFeedback(feedback);
      const frequency = this.proxySettings.phase;
      this.phaser.setFrequency(frequency);
      this.phaser2.setFrequency(frequency);
      const bandwidth = this.proxySettings.bandwidth;
      this.phaser.setBandWidth(bandwidth);
      this.phaser2.setBandWidth(bandwidth);

      this.setOutputConnection();
      this.setWetDry(this.proxySettings.wetDry);
    }
  }

  protected setModFrequency(freq: number) {
    this.proxySettings.lfoFrequency = freq;
    this.lfo.frequency.value = this.lfo2.frequency.value = freq / 3;
  }

  lastLevel: number = 0;

  protected setModLevel($event: number) {
    this.proxySettings.modDepth = $event;
    const level = $event;
    this.lastLevel = level;
    if (this.proxySettings.modulation === onOff.on) {
      this.modGain.gain.value = level;
      this.modGain2.gain.value = level;
    }
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
        if (value === "sine") {
          // Use modulators in quadrature
          this.lfo.setPeriodicWave(this.audioCtx.createPeriodicWave([0, 1], [0, 0]));
          this.lfo2.setPeriodicWave(this.audioCtx.createPeriodicWave([0, 0], [0, 1]));
        } else {
          this.lfo.type = value;
          this.lfo2.type = value;
        }
        this.proxySettings.modWaveform = value as modWaveforms;
      });
    }
    const modOnOff = this.modOnOff.nativeElement;
    for (let j = 0; j < modOnOff.elements.length; ++j) {
      modOnOff.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as string;
        if (value === 'on') {
          this.modGain.gain.value = this.lastLevel;
          this.modGain2.gain.value = this.lastLevel;
        } else {
          this.modGain.gain.value = 0;
          this.modGain2.gain.value = 0;
        }
        this.proxySettings.modulation = value as onOff;
      });
    }
  }

  ngOnDestroy(): void {
    this.lfo.disconnect();
    this.lfo2.disconnect();
    this.modGain.disconnect();
    this.modGain2.disconnect();
    this.panner.disconnect();
    this.panner2.disconnect();
    this.disconnect();
    this.phaser.destroy();
    this.phaser2.destroy();
  }
}
