import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {WhiteNoise} from '../modules/noise/white-noise';
import {PinkNoise} from '../modules/noise/pink-noise';
import {BrownNoise} from '../modules/noise/brown-noise';
import {LevelControlComponent} from '../level-control/level-control.component';
import {FilterComponent} from '../filter/filter-component';
import {dialStyle} from '../level-control/levelControlParameters';
import {NoiseSettings} from '../settings/noise';
import {noiseOutputs, onOff} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';

@Component({
  selector: 'app-noise',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './noise-component.html',
  styleUrl: './noise-component.scss',
})
export class NoiseComponent implements AfterViewInit {
  private whiteNoise: WhiteNoise[] = [];
  private pinkNoise: PinkNoise[] = [];
  private brownNoise: BrownNoise[] = [];
  private settings!: NoiseSettings;

  @Input() numberOfChannels!: number;
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


  constructor() {
  }

  async start(audioCtx: AudioContext) {
    if (this.numberOfChannels) {
      for (let i = 0; i < this.numberOfChannels; ++i) {
        this.whiteNoise.push(new WhiteNoise(audioCtx));
        this.pinkNoise.push(new PinkNoise(audioCtx));
         this.brownNoise.push(new BrownNoise(audioCtx));
        await this.whiteNoise[i].start();
        await this.pinkNoise[i].start();
        await this.brownNoise[i].start();
      }
    }
    this.applySettings();
  }

  // Called after all synth components have been started
  setOutputConnection () {
    SetRadioButtons.set(this.noiseOutputToForm, this.settings.output);
  }


  applySettings(settings: NoiseSettings = new NoiseSettings()) {
    this.settings = settings;
    for (let i = 0; i < this.numberOfChannels; ++i) {
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
    this.attack.setValue(this.settings.adsr.attackTime);
    this.decay.setValue(this.settings.adsr.decayTime);
    this.sustain.setValue(this.settings.adsr.sustainLevel);
    this.release.setValue(this.settings.adsr.releaseTime);
    this.gainControl.setValue(settings.gain);

  //  SetRadioButtons.set(this.noiseOutputToForm, this.settings.output);
    SetRadioButtons.set(this.noiseTypeForm, this.settings.type);
    SetRadioButtons.set(this.amplitudeEnvelopeOnOffForm, this.settings.useAmplitudeEnvelope);
  }

  protected setGain(gain: number) {
    this.settings.gain = gain;
    const noiseType = this.settings.type;

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
    this.settings.type = noiseType;
    const gain = this.settings.gain;

    for (let i = 0; i < this.numberOfChannels; ++i) {
      this.whiteNoise[i].setGain(0);
      this.pinkNoise[i].setGain(0);
      this.brownNoise[i].setGain(0);
    }
    const source: WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.noiseSource();
    for (let i = 0; i < this.numberOfChannels; ++i) {
      source[i].setGain(gain);
      source[i].useAmplitudeEnvelope = this.settings.useAmplitudeEnvelope == onOff.on;
    }
  }

  connect(node: AudioNode) {
    this.settings.output = noiseOutputs.speaker;
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
    this.settings.output = noiseOutputs.filter;
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
      console.log("Filter array is a different size to numberOfChannels")
    return ok;
  }

  disconnect() {
    this.settings.output = noiseOutputs.off;
    for (let i = 0; i < this.numberOfChannels; i++) {
      this.whiteNoise[i].disconnect();
      this.pinkNoise[i].disconnect();
      this.brownNoise[i].disconnect();
    }
  }

  private noiseSource(): WhiteNoise[] | PinkNoise[] | BrownNoise[] {
    let source: WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.whiteNoise;
    switch (this.settings.type) {
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
    this.settings.useAmplitudeEnvelope = useAmplitudeEnvelope ? onOff.on : onOff.off;
    let source : WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.noiseSource();
    for (let i = 0; i < this.numberOfChannels; i++) {
      source[i].useAmplitudeEnvelope = useAmplitudeEnvelope;
    }
  }

  keyDown(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfChannels) {
      let source: WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.noiseSource();
      if(this.settings.output === noiseOutputs.speaker)
        keyIndex = 0;  // Wired straight to the output, so we only use a single channel to avoid overload
      source[keyIndex].keyDown();
    }
  }

  keyUp(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfChannels) {
      let source: WhiteNoise[] | PinkNoise[] | BrownNoise[] = this.noiseSource();
      if(this.settings.output === noiseOutputs.speaker)
        keyIndex = 0; // Wired straight to the output, so we only use a single channel to avoid overload
      source[keyIndex].keyUp();
    }
  }

  protected setAttack($event: number) {
    this.settings.adsr.attackTime = $event;
  }

  protected setDecayTime($event: number) {
    this.settings.adsr.decayTime = $event * 10;
  }

  protected setSustainLevel($event: number) {
    this.settings.adsr.sustainLevel = $event;
  }

  protected setReleaseTime($event: number) {
    this.settings.adsr.releaseTime = $event * 10;
  }

  protected readonly dialStyle = dialStyle;

  ngAfterViewInit(): void {
    const noiseOutputToForm = this.noiseOutputToForm.nativeElement;
    for (let i = 0; i < noiseOutputToForm.elements.length; ++i) {
      noiseOutputToForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.output.emit(value);
        this.settings.output = value;
      });
    }

    const noiseTypeForm = this.noiseTypeForm.nativeElement;
    for (let i = 0; i < noiseTypeForm.elements.length; ++i) {
      noiseTypeForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.setNoiseType(value);
        this.settings.type = value;
      });
    }

    const amplitudeEnvelopeOnOffForm = this.amplitudeEnvelopeOnOffForm.nativeElement;
    for (let i = 0; i < amplitudeEnvelopeOnOffForm.elements.length; ++i) {
      amplitudeEnvelopeOnOffForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.useAmplitudeEnvelope(value === 'on');
        this.settings.useAmplitudeEnvelope = value;
      });
    }
  }
}
