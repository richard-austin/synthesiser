import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {RingModulator} from '../modules/ring-modulator';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {RingModSettings} from '../settings/ring-mod';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {modWaveforms, onOff, ringModOutput} from '../enums/enums';
import {FilterComponent} from '../filter/filter-component';
import {ReverbComponent} from '../reverb-component/reverb-component';

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
  settings!: RingModSettings;

  @Input() filters!: FilterComponent;
  @Input() reverb!: ReverbComponent;
  @Input() numberOfChannels!: number;
  @Output() output: EventEmitter<string> = new EventEmitter();

  @ViewChild('modFreq') modFreq!: LevelControlComponent;
  @ViewChild('modDepth') modDepth!: LevelControlComponent;
  @ViewChild('modWaveForm') modWaveForm!: ElementRef<HTMLFormElement>;
  @ViewChild('internalModForm') internalModForm!: ElementRef<HTMLFormElement>;
  @ViewChild('outputToForm') outputToForm!: ElementRef<HTMLFormElement>;

  start(audioCtx: AudioContext) {
    this.ringMod = new RingModulator(audioCtx);

    this.settings = new RingModSettings()
    // Set default ring mod settings
    this.applySettings(this.settings);
  }

  protected readonly dialStyle = dialStyle


  protected setFrequency($event: number)
  {
    this.settings.modFrequency = $event;
    const freq = 4500 * (Math.pow(Math.pow(2, 1 / 12), $event) - 1);
    this.ringMod.setModFrequency(freq);
  }

  protected setModDepth($event: number) {
    this.settings.modDepth = $event;
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
    const filters = this.filters.filters;
    let ok = false;
    if (filters && filters.length === this.numberOfChannels) {
      ok = true;
      for (let i = 0; i < this.numberOfChannels; i++) {
        this.ringMod.connect(filters[i].filter);
      }
    } else
      console.log("Filter array is a different size to numberOfChannels")
    return ok;
  }
  connectToReverb(): boolean {
    const reverb = this.reverb;
    let ok = false;
    if(reverb) {
      ok = true;
      this.ringMod.connect(reverb.input);
    }
    return ok;
  }


  disconnect() {
    this.ringMod.disconnect();
  }

  applySettings(settings: RingModSettings = new RingModSettings()) {
    // this.ringMod.internalMod(settings.internalMod===onOff.on);
    // this.ringMod.setModDepth(settings.modDepth);


    // Set up the dial positions
    this.modFreq.setValue(settings.modFrequency);
    this.modDepth.setValue(settings.modDepth);

    // Set the mod waveform buttons and ring mod settings
    SetRadioButtons.set(this.modWaveForm, settings.modWaveform);
    SetRadioButtons.set(this.internalModForm, settings.internalMod);
    SetRadioButtons.set(this.outputToForm, settings.output);
    this.output.emit(settings.output);
  }

  ngAfterViewInit(): void {
    const internalModForm = this.internalModForm.nativeElement;
    for (let j = 0; j < internalModForm.elements.length; ++j) {
      internalModForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as string;
        this.settings.internalMod = value as onOff;
        this.ringMod.internalMod(value==='on');
      });
    }
    const modWaveForm = this.modWaveForm.nativeElement;
    for (let j = 0; j < modWaveForm.elements.length; ++j) {
      modWaveForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as OscillatorType;
        this.settings.modWaveform = value as modWaveforms;
        this.ringMod.setModWaveform(value);
      });
    }
    const outputToForm = this.outputToForm.nativeElement;
    for (let j = 0; j < outputToForm.elements.length; ++j) {
      outputToForm.elements[j].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value as string;
        this.settings.output = value as ringModOutput;
        this.output.emit(value);
      });
    }
  }
}
