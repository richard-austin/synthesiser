import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {oscModType} from '../enums/enums';
import {MatrixControlSettings} from '../settings/matrix';
import {OscillatorComponent} from '../oscillator/oscillator.component';
import DevicePoolManager from '../util-classes/device-pool-manager';

export interface ModSetting {modType:oscModType, carrier: number, modulator: number}
export interface ModLevel {level: number, carrier: number, modulator: number}

@Component({
  selector: 'app-matrix-control',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './matrix-control-component.html',
  styleUrl: './matrix-control-component.scss',
})
export class MatrixControlComponent implements AfterViewInit{
  protected dialStyle: dialStyle = dialStyle.green;
  private ctlSettings!: MatrixControlSettings;
  @Input() carrierNum!: number;
  @Input() modulatorNum!: number;
  @Input() signalSelectOperator!: WritableSignal<number>;

  @Output() modSelection = new EventEmitter<ModSetting>();
  @Output() modLevel = new EventEmitter<ModLevel>();

  @ViewChild('modSelect') modSelect!: ElementRef<HTMLFormElement>;
  @ViewChild('level') levelControl!: LevelControlComponent;

  modulator!: OscillatorComponent;
  carrier!: OscillatorComponent;
  modulationGain: GainNode[] = [];


  start(audioCtx:AudioContext, ctrlSettings: MatrixControlSettings, modulator: OscillatorComponent | undefined, carrier: OscillatorComponent | undefined) {
    this.modulationGain = [];
    for (let i = 0; i < DevicePoolManager.numberOfDevices; ++i) {
      this.modulationGain.push(new GainNode(audioCtx));
      this.modulationGain[i].gain.value = 1;
    }

    this.ctlSettings = ctrlSettings;
    this.modulator = modulator as OscillatorComponent;
    this.modulator.connectModOut(this.modulationGain);
    this.carrier = carrier as OscillatorComponent;
    this.setModType(ctrlSettings.setting);
    this.levelControl.setValue(ctrlSettings.level);
  }

  protected setModLevel(level: number) {
    this.modulationGain.forEach((gain) => gain.gain.value = level);
    this.ctlSettings.level = level;
  }

  public setModType(modType: oscModType) {
    const elements = this.modSelect.nativeElement.elements;
    // @ts-ignore
    elements["0"].checked = elements["1"].checked = false;
    const element = modType === oscModType.frequency ? elements["1"] : elements["0"];

    // @ts-ignore
    element.checked = modType === oscModType.frequency || modType === oscModType.amplitude;
    element.dispatchEvent(new Event('change'));
  }

  private _setModType(modType: oscModType) {
    if(modType === oscModType.off){
      this.dialStyle = dialStyle.green;
    } else if (modType === oscModType.amplitude) {
      this.dialStyle = dialStyle.magenta;
    } else if (modType === oscModType.frequency) {
      this.dialStyle = dialStyle.red;
    }
    this.levelControl.changeStyle(this.dialStyle)
 //   this.carrier.modulation(this.gainNode, modType);
    this.modSelection.emit({modType: modType, carrier: this.carrierNum, modulator: this.modulatorNum});
  }

  protected selectOperator(modulatorNum: number) {
      this.signalSelectOperator.set(modulatorNum);
  }

  ngAfterViewInit(): void {
    const modSelect = this.modSelect.nativeElement;
    for (let j = 0; j < modSelect.elements.length; ++j) {
      modSelect.elements[j].addEventListener('change', ($event) => {
        const target = $event.target as HTMLInputElement;
        const checked = target.checked;
        const value: oscModType = checked ? target.value as oscModType : oscModType.off;
        const otherCheckBox = (j+1) % 2;
        if(checked)
          (modSelect.elements[otherCheckBox] as HTMLInputElement).checked = false;
        this._setModType(value);
        this.carrier.modulation(this.modulationGain, value);
      });
    }
  }

}
