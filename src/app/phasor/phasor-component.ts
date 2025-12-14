import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {Phasor} from '../modules/phasor';
import {dialStyle} from '../level-control/levelControlParameters';
import {Oscillator} from '../modules/oscillator';
import {PhasorSettings} from '../settings/phasor';
import {modWaveforms, onOff, phasorOutputs} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';

@Component({
  selector: 'app-phasor',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './phasor-component.html',
  styleUrl: './phasor-component.scss',
})
export class PhasorComponent implements AfterViewInit {
  public input!: GainNode;
  private gain!: GainNode;
  phasor!:Phasor;
  settings!: PhasorSettings;

  protected readonly dialStyle = dialStyle;
  private lfo!: Oscillator;
  private negModGain!: GainNode;

  @ViewChild('phasorOnOffForm') phasorOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modFreq') modFreq!: LevelControlComponent;
  @ViewChild('modDepth') modLevel!: LevelControlComponent;
  @ViewChild('phase') phase!: LevelControlComponent;
  @ViewChild('level') level!: LevelControlComponent;
  @ViewChild('lfoWaveForm') lfoWaveForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modOnOffForm') modOnOff!: ElementRef<HTMLFormElement>;

  setUp(audioCtx:AudioContext){
    this.lfo = new Oscillator(audioCtx);
    this.lfo.setType('sine');
    this.lfo.useAmplitudeEnvelope = false;
    this.input = audioCtx.createGain();
    this.input.gain.value = 1;
    this.negModGain = audioCtx.createGain();
    this.negModGain.gain.value = -1;
    this.lfo.connect(this.negModGain);

    this.gain = audioCtx.createGain();
    this.gain.gain.value = 1;
    this.gain.connect(audioCtx.destination);
    this.phasor = new Phasor(audioCtx, this.input, this.gain);

    // Set up LFO default values
    this.applySettings();
  }

  applySettings(settings:PhasorSettings = new PhasorSettings()) {
    this.settings = settings;

    // Set up the dials
    this.modFreq.setValue(settings.lfoFrequency);
    this.modLevel.setValue(settings.modDepth);
    this.phase.setValue(settings.phase);
    this.level.setValue(settings.gain);

    SetRadioButtons.set(this.phasorOnOffForm, this.settings.output);
    SetRadioButtons.set(this.lfoWaveForm, this.settings.modWaveform);
    SetRadioButtons.set(this.modOnOff, this.settings.output);
  }

  protected setPhase($event: number) {
    this.settings.phase = $event;
    this.phasor.setPhase($event/80);
  }

  protected setLevel($event: number) {
    this.settings.gain = $event;
    this.phasor.setLevel($event);
  }

  private phasorOnOff(phasor: boolean) {
    this.gain.gain.value = phasor ? 1 : 0;
  }

  protected setModFrequency(freq: number) {
    this.settings.lfoFrequency = freq;
    this.lfo.setFrequency(freq/3);
  }

  lastLevel: number = 0;
  protected setModLevel($event: number) {
    this.settings.lfoFrequency = $event;
    const level = $event /60;
    this.lastLevel = level;
    this.lfo.setGain(level);
    this.negModGain.gain.value =-1;
  }

  ngAfterViewInit(): void {
    const phasorOnOff = this.phasorOnOffForm.nativeElement;
    for (let i = 0; i < phasorOnOff.elements.length; ++i) {
      phasorOnOff.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.phasorOnOff(value === 'on');
        this.settings.output = value as phasorOutputs;
      });
    }

    const lfoWaveForm = this.lfoWaveForm.nativeElement;
    for (let j = 0; j < lfoWaveForm.elements.length; ++j) {
      lfoWaveForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as OscillatorType;
        this.lfo.setType(value);
        this.settings.modWaveform = value as modWaveforms;
      })
    }
    const modOnOff = this.modOnOff.nativeElement;
    for (let j = 0; j < modOnOff.elements.length; ++j) {
      modOnOff.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as string;
        if(value === 'on')
          this.lfo.setGain(this.lastLevel);
        else
          this.lfo.setGain(0);
        this.settings.modulation = value as onOff;
      });
    }
  }
}
