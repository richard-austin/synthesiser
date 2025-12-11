import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {Phasor} from '../modules/phasor';
import {dialStyle} from '../level-control/levelControlParameters';
import {Oscillator} from '../modules/oscillator';

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

  protected readonly dialStyle = dialStyle;
  private lfo!: Oscillator;
  private negModGain!: GainNode;

  @ViewChild('phasorOnOffForm') phasorOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modFreq') modFreq!: LevelControlComponent;
  @ViewChild('modDepth') modLevel!: LevelControlComponent;
  @ViewChild('lfoWaveForm') lfoWaveForm!: ElementRef<HTMLFormElement>;
  @ViewChild('modOnOffForm') modOnOff!: ElementRef<HTMLFormElement>;

  setUp(audioCtx:AudioContext){
    this.lfo = new Oscillator(audioCtx);
    this.lfo.setType('sine');
    this.lfo.useAmplitudeEnvelope = false;
    this.negModGain = audioCtx.createGain();
    this.negModGain.gain.value = -1;
    this.lfo.connect(this.negModGain);
    this.input = audioCtx.createGain();
    this.input.gain.value = 1;

    this.gain = audioCtx.createGain();
    this.gain.gain.value = 1;
    this.gain.connect(audioCtx.destination);
    this.phasor = new Phasor(audioCtx, this.input, this.gain);

    // Set up LFO default values
    this.modFreq.setValue(4);  // Set dial
    this.setModFrequency(0.05);   // Set actual mod frequency
    this.modLevel.setValue(0);  // Set dial
    this.setModLevel(0); // Set actual mod depth

    this.lfo.connect(this.phasor.delay1.delayTime);
    this.negModGain.connect(this.phasor.delay2.delayTime);
    this.phasorOnOff(false);
  }

  protected setPhase($event: number) {
    this.phasor.setPhase($event/80);
  }

  protected setLevel($event: number) {
    this.phasor.setLevel($event);
  }

  private phasorOnOff(phasor: boolean) {
    this.gain.gain.value = phasor ? 1 : 0;
  }

  protected setModFrequency(freq: number) {
    this.lfo.setFrequency(freq/3);
  }

  lastLevel: number = 0;
  protected setModLevel($event: number) {
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
      });
    }

    const lfoWaveForm = this.lfoWaveForm.nativeElement;
    for (let j = 0; j < lfoWaveForm.elements.length; ++j) {
      lfoWaveForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as OscillatorType;
        this.lfo.setType(value);
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
      });
    }
  }
}
