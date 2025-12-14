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
import {GainEnvelopeBase} from '../modules/gain-envelope-base';
import {OscFilterBase} from '../modules/osc-filter-base';

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
  private whiteNoise!: WhiteNoise;
  private pinkNoise!: PinkNoise;
  private brownNoise!: BrownNoise;

  private gainArray: GainNode[] = [];
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
    this.audioCtx = audioCtx;

    if (this.numberOfChannels) {
      this.whiteNoise = new WhiteNoise(audioCtx);
      this.pinkNoise = new PinkNoise(audioCtx);
      this.brownNoise = new BrownNoise(audioCtx);

      await this.whiteNoise.start();
      await this.pinkNoise.start();
      await this.brownNoise.start();

      for (let i = 0; i < this.numberOfChannels; ++i) {
        this.gainArray.push(new GainNode(audioCtx));
        this.whiteNoise.connect(this.gainArray[i])
        this.pinkNoise.connect(this.gainArray[i]);
        this.brownNoise.connect(this.gainArray[i]);
      }
    }
    this.applySettings();
  }

  applySettings(settings: NoiseSettings = new NoiseSettings()) {
    this.settings = settings;

    for (let i = 0; i < this.numberOfChannels; ++i) {
      if (settings.useAmplitudeEnvelope === onOff.on)
        this.gainArray[i].gain.value = GainEnvelopeBase.minLevel;
      else
        this.gainArray[i].gain.value = this.settings.gain;
    }
    this.attack.setValue(this.settings.adsr.attackTime);
    this.decay.setValue(this.settings.adsr.decayTime);
    this.sustain.setValue(this.settings.adsr.sustainLevel);
    this.release.setValue(this.settings.adsr.releaseTime);
    this.gainControl.setValue(settings.gain);

    SetRadioButtons.set(this.noiseOutputToForm, this.settings.output);
    SetRadioButtons.set(this.noiseTypeForm, this.settings.type);
    SetRadioButtons.set(this.amplitudeEnvelopeOnOffForm, this.settings.useAmplitudeEnvelope);
  }

  protected setGain(gain: number) {
    this.settings.gain = gain;
    switch (this.settings.type) {
      case 'white':
        this.whiteNoise.setGain(gain);
        break;
      case 'pink':
        this.pinkNoise.setGain(gain);
        break;
      case 'brown':
        this.brownNoise.setGain(gain);
        break;
    }
  }

  private setNoiseType(noiseType: any) {
    this.settings.type = noiseType;
    this.whiteNoise.setGain(0);
    this.pinkNoise.setGain(0);
    this.brownNoise.setGain(0);
    const gain = this.settings.gain;
    switch (noiseType) {
      case 'white':
        this.whiteNoise.setGain(gain);
        break;
      case 'pink':
        this.pinkNoise.setGain(gain);
        break;
      case 'brown':
        this.brownNoise.setGain(gain);
        break;
    }
  }

  connect(node: AudioNode) {
    this.settings.output = noiseOutputs.speaker;
    for (let i = 0; i < this.numberOfChannels; ++i) {
      this.gainArray[i].disconnect();
    }
    this.gainArray[0].connect(node);
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
        this.gainArray[i].connect(filters[i].filter);
      }
    } else
      console.log("Filter array is a different size to numberOfChannels")
    return ok;
  }

  disconnect() {
    this.settings.output = noiseOutputs.off;
    for (let i = 0; i < this.numberOfChannels; i++) {
      this.gainArray[i].disconnect();
    }
  }
  useAmplitudeEnvelope(useAmplitudeEnvelope: boolean) {
    this.settings.useAmplitudeEnvelope = useAmplitudeEnvelope ? onOff.on : onOff.off;

    let gainToUse = this.settings.gain;
    if (this.settings.useAmplitudeEnvelope === onOff.on)
      gainToUse = OscFilterBase.minLevel;
    for (let i = 0; i < this.numberOfChannels; ++i) {
      this.gainArray[i].gain.cancelAndHoldAtTime(this.audioCtx.currentTime);
      this.gainArray[i].gain.setValueAtTime(gainToUse, this.audioCtx.currentTime);
    }
  }

  keyDown(keyIndex: number) {
    this.whiteNoise.keyDown()
    if (keyIndex >= 0 && keyIndex < this.numberOfChannels) {
      let source: GainNode[] = this.gainArray;
      if (this.settings.output === noiseOutputs.speaker)
        keyIndex = 0;  // Wired straight to the output, so we only use a single channel to avoid overload
      const ctx = this.audioCtx;
      if (this.settings.useAmplitudeEnvelope === onOff.on) {
        const adsr = this.settings.adsr;
        const node = source[keyIndex];
        node.gain.cancelAndHoldAtTime(ctx.currentTime);
        node.gain.setValueAtTime(GainEnvelopeBase.minLevel, ctx.currentTime);
        node.gain.exponentialRampToValueAtTime(GainEnvelopeBase.maxLevel, ctx.currentTime + adsr.attackTime);
        node.gain.exponentialRampToValueAtTime(adsr.sustainLevel, ctx.currentTime + adsr.attackTime + adsr.decayTime);
      }
    }
  }

  keyUp(keyIndex: number) {
    if (keyIndex >= 0 && keyIndex < this.numberOfChannels) {
      let source: GainNode[] = this.gainArray;
      if (this.settings.output === noiseOutputs.speaker)
        keyIndex = 0; // Wired straight to the output, so we only use a single channel to avoid overload

      const adsr = this.settings.adsr;
      const node = source[keyIndex];
      const ctx = this.audioCtx;
      if (this.settings.useAmplitudeEnvelope === onOff.on) {
        node.gain.cancelAndHoldAtTime(ctx.currentTime);
        node.gain.exponentialRampToValueAtTime(GainEnvelopeBase.minLevel, ctx.currentTime + adsr.releaseTime);
      }
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
