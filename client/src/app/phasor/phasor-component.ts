import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {Phasor} from '../modules/phasor';
import {dialStyle} from '../level-control/levelControlParameters';
import {PhasorSettings} from '../settings/phasor';
import {modWaveforms, onOff, phasorOutputs} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {Cookies} from '../settings/cookies/cookies';

@Component({
  selector: 'app-phasor',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './phasor-component.html',
  styleUrl: './phasor-component.scss',
})
export class PhasorComponent implements AfterViewInit, OnDestroy {
  public input!: GainNode;
  private gain!: GainNode;
  phasor!:Phasor;
  proxySettings!: PhasorSettings;
  cookies!: Cookies;

  protected readonly dialStyle = dialStyle;
  private lfo!: OscillatorNode;
  private negModGain!: GainNode;
  private modGain!: GainNode;

  @Input() numberOfOscillators!: number;

  @Output() output: EventEmitter<string> = new EventEmitter();

  @ViewChild('phasorOnOffForm') phasorOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modFreq') modFreq!: LevelControlComponent;
  @ViewChild('modDepth') modLevel!: LevelControlComponent;
  @ViewChild('phase') phase!: LevelControlComponent;
  @ViewChild('level') level!: LevelControlComponent;
  @ViewChild('lfoWaveForm') lfoWaveForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modOnOffForm') modOnOff!: ElementRef<HTMLFormElement>;

  setUp(audioCtx:AudioContext, settings:PhasorSettings | null):void {
    this.lfo = new OscillatorNode(audioCtx);
    this.lfo.type = 'sine';
  //  this.lfo.useAmplitudeEnvelope = false;
    this.lfo.start();
    this.input = audioCtx.createGain();
    this.input.gain.value = 1;
    this.modGain = audioCtx.createGain();
    this.modGain.gain.value = 1;
    this.negModGain = audioCtx.createGain();
    this.negModGain.gain.value = -1;
    this.modGain.connect(this.negModGain);
    this.lfo.connect(this.modGain);

    this.gain = audioCtx.createGain();
    this.gain.gain.value = 1;
    this.phasor = new Phasor(audioCtx, this.input, this.gain);
    this.cookies = new Cookies();

    // Set up LFO default values
    this.modGain.connect(this.phasor.delay1.delayTime);
    this.negModGain.connect(this.phasor.delay2.delayTime);
    this.applySettings(settings);
  }

  // Called after all synth components have been started
  setOutputConnection () {
    SetRadioButtons.set(this.phasorOnOffForm, this.proxySettings.output);
  }

  applySettings(settings:PhasorSettings | null) {
    const cookieName = 'phasor';

    if(!settings) {
      settings = new PhasorSettings();
      const savedSettings = this.cookies.getSettings(cookieName, settings);

      if (Object.keys(savedSettings).length > 0)
        settings = savedSettings as PhasorSettings;  // Use values from cookie
      else
        settings;  // Use default values
    }

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);

    // Set up the dials
    this.modFreq.setValue(settings.lfoFrequency);
    this.modLevel.setValue(settings.modDepth);
    this.phase.setValue(settings.phase);
    this.level.setValue(settings.gain);

    SetRadioButtons.set(this.lfoWaveForm, this.proxySettings.modWaveform);
    SetRadioButtons.set(this.modOnOff, this.proxySettings.modulation);
  }

  public getSettings(): PhasorSettings {
    return this.proxySettings;
  }

  protected setPhase($event: number) {
    this.proxySettings.phase = $event;
    this.phasor.setPhase($event/80);
  }

  protected setLevel($event: number) {
    this.proxySettings.gain = $event;
    this.phasor.setLevel($event);
  }

  protected setModFrequency(freq: number) {
    this.proxySettings.lfoFrequency = freq;
    this.lfo.frequency.value = freq/3;
  }

  lastLevel: number = 0;
  protected setModLevel($event: number) {
    this.proxySettings.modDepth = $event;
    const level = $event /60;
    this.lastLevel = level;
    this.modGain.gain.value =  level;
    this.negModGain.gain.value =-1;
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
        this.lfo.type =value;
        this.proxySettings.modWaveform = value as modWaveforms;
      });
    }
    const modOnOff = this.modOnOff.nativeElement;
    for (let j = 0; j < modOnOff.elements.length; ++j) {
      modOnOff.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as string;
        if(value === 'on')
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
    this.negModGain.disconnect();
    this.disconnect();
  }
}
