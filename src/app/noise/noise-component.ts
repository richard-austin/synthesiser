import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {WhiteNoise} from '../modules/noise/white-noise';
import {PinkNoise} from '../modules/noise/pink-noise';
import {BrownNoise} from '../modules/noise/brown-noise';
import {LevelControlComponent} from '../level-control/level-control.component';
import {FilterComponent} from '../filter/filter-component';
import {dialStyle} from '../level-control/levelControlParameters';
import {ADSRValues} from '../util-classes/adsrvalues';

@Component({
  selector: 'app-noise',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './noise-component.html',
  styleUrl: './noise-component.scss',
})
export class NoiseComponent implements AfterViewInit {
  private audioCtx!: AudioContext;
  private whiteNoise: WhiteNoise[] = [];
  private pinkNoise: PinkNoise[] = [];
  private brownNoise: BrownNoise[] = [];
  private adsr!: ADSRValues;
  private noiseType: string = 'white';
  private gainLevel: number = 0;

  @Input() numberOfChannels!: number;
  @Input() filters!: FilterComponent;
  @Output() output = new EventEmitter<string>();

  @ViewChild('noiseTypeForm') noiseTypeForm!: ElementRef<HTMLFormElement>;
  @ViewChild('noiseOutputToForm') noiseOutputToForm!: ElementRef<HTMLFormElement>;
  @ViewChild('gainControl') gainControl!: LevelControlComponent;
  @ViewChild('amplitudeEnvelopeOnOffForm') amplitudeEnvelopeOnOffForm!: ElementRef<HTMLFormElement>;

  constructor() {
  }

  async start(audioCtx: AudioContext) {

    this.audioCtx = audioCtx;

    if (this.numberOfChannels) {
      this.adsr = new ADSRValues(0.2, 0.5, 1, 4);
      for (let i = 0; i < this.numberOfChannels; ++i) {
        this.whiteNoise.push(new WhiteNoise(audioCtx));
        this.whiteNoise[i].setGain(0);
        this.whiteNoise[i].useAmplitudeEnvelope = false;
        this.pinkNoise.push(new PinkNoise(audioCtx));
        this.pinkNoise[i].setGain(0);
        this.pinkNoise[i].useAmplitudeEnvelope = false;
        this.brownNoise.push(new BrownNoise(audioCtx));
        this.brownNoise[i].setGain(0);
        this.brownNoise[i].setGain(0);
        this.brownNoise[i].useAmplitudeEnvelope = false;
        await this.whiteNoise[i].start();
        await this.pinkNoise[i].start();
        await this.brownNoise[i].start();
      }
    }
  }

  protected setGain(gain: number) {
    this.gainLevel = gain;
    const noiseType = this.noiseType;

    for (let i = 0; i < this.numberOfChannels; i++) {
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
    this.noiseType = noiseType;

    for (let i = 0; i < this.numberOfChannels; ++i) {
      this.whiteNoise[i].setGain(0);
      this.pinkNoise[i].setGain(0);
      this.brownNoise[i].setGain(0);
    }
    const source = this.noiseSource();
    for (let i = 0; i < this.numberOfChannels; ++i) {
      source[i].setGain(this.gainLevel);
    }
  }

  connect(node: AudioNode) {
    for (let i = 0; i < this.numberOfChannels; ++i) {
      this.whiteNoise[i].disconnect();
      this.pinkNoise[i].disconnect();
      this.brownNoise[i].disconnect();
    }
    this.whiteNoise[0].connect(node);
    this.pinkNoise[0].connect(node);
    this.brownNoise[0].connect(node);
  }

  /**
   * connectToFilters: Connect to a group of filters
   */
  connectToFilters(): boolean {
    const filters = this.filters.filters;
    let ok = false;
    if (filters && filters.length === this.numberOfChannels) {
      ok = true;
      for (let i = 0; i < this.numberOfChannels; i++) {
        this.whiteNoise[i].connect(filters[i].filter);
        this.pinkNoise[i].connect(filters[i].filter);
        this.brownNoise[i].connect(filters[i].filter);
      }
    } else
      console.log("Filter array is a different size to the oscillator array")
    return ok;
  }

  disconnect() {
    for (let i = 0; i < this.numberOfChannels; i++) {
      this.whiteNoise[i].disconnect();
      this.pinkNoise[i].disconnect();
      this.brownNoise[i].disconnect();
    }
  }

  private noiseSource(): any {
    let source: any = this.whiteNoise;
    switch (this.noiseType) {
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
    let source = this.noiseSource();
    for (let i = 0; i < this.numberOfChannels; i++) {
      source[i].useAmplitudeEnvelope = useAmplitudeEnvelope;
    }
  }

  keyDown(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfChannels) {
      let source = this.noiseSource();
      source[keyIndex].keyDown();
    }
  }

  keyUp(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfChannels) {
      let source = this.noiseSource();
      source[keyIndex].keyUp();
    }
  }

  protected setAttack($event: number) {
    this.adsr.attackTime = $event;
  }

  protected setDecayTime($event: number) {
    this.adsr.decayTime = $event * 10;
  }

  protected setSustainLevel($event: number) {
    this.adsr.sustainLevel = $event;
  }

  protected setReleaseTime($event: number) {
    this.adsr.releaseTime = $event * 10;
  }

  protected readonly dialStyle = dialStyle;

  ngAfterViewInit(): void {
    const noiseOutputToForm = this.noiseOutputToForm.nativeElement;
    for (let i = 0; i < noiseOutputToForm.elements.length; ++i) {
      noiseOutputToForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.output.emit(value);
      });
    }

    const noiseTypeForm = this.noiseTypeForm.nativeElement;
    for (let i = 0; i < noiseTypeForm.elements.length; ++i) {
      noiseTypeForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.setNoiseType(value);
      });
    }

    const amplitudeEnvelopeOnOffForm = this.amplitudeEnvelopeOnOffForm.nativeElement;
    for (let i = 0; i < amplitudeEnvelopeOnOffForm.elements.length; ++i) {
      amplitudeEnvelopeOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.useAmplitudeEnvelope(value === 'on');
      });
    }
  }
}
