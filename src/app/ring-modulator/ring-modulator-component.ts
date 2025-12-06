import {AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild} from '@angular/core';
import {RingModulator} from '../modules/ring-modulator';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';

@Component({
  selector: 'app-ring-modulator',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './ring-modulator-component.html',
  styleUrl: './ring-modulator-component.scss',
})
export class RingModulatorComponent implements AfterViewInit {
  ringMod!: RingModulator;
  private audioCtx!: AudioContext;

  @Output() output: EventEmitter<string> = new EventEmitter();

  @ViewChild('modFreq') modFreq!: LevelControlComponent;
  @ViewChild('modDepth') modLevel!: LevelControlComponent;
  @ViewChild('modWaveForm') modWaveForm!: ElementRef<HTMLFormElement>;
  @ViewChild('internalModForm') internalModForm!: ElementRef<HTMLFormElement>;
  @ViewChild('outputToForm') outputToForm!: ElementRef<HTMLFormElement>;

  start(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
    this.ringMod = new RingModulator(audioCtx);
    this.ringMod.internalMod(false);
    this.ringMod.setModDepth(0);
    this.ringMod.setModDepth(0);
  }

  protected readonly dialStyle = dialStyle;

  protected setFrequency($event: number) {
    const freq = 4500 * (Math.pow(Math.pow(2, 1 / 12), $event) - 1);
    this.ringMod.setModFrequency(freq);
  }

  protected setModDepth($event: number) {
    this.ringMod.setModDepth($event);
  }

  modInput() {
    return this.ringMod.modInput();
  }

  signalInput() {
    return this.ringMod.signalInput();
  }

  connect(node: AudioNode) {
     this.ringMod.connect(node);
  }

  connectToFilters() {

  }

  disconnect() {
    this.ringMod.disconnect();
  }

  ngAfterViewInit(): void {
    const internalModForm = this.internalModForm.nativeElement;
    for (let j = 0; j < internalModForm.elements.length; ++j) {
      internalModForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as string;
        this.ringMod.internalMod(value==='on');
      });
    }
    const modWaveForm = this.modWaveForm.nativeElement;
    for (let j = 0; j < modWaveForm.elements.length; ++j) {
      modWaveForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as OscillatorType;
        this.ringMod.setModWaveform(value);
      });
    }
    const outputToForm = this.outputToForm.nativeElement;
    for (let j = 0; j < outputToForm.elements.length; ++j) {
      outputToForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as string;
        this.output.emit(value);
      });
    }
  }
}
