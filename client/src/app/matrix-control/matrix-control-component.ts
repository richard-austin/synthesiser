import {
  AfterViewInit,
  Component,
  ElementRef, inject,
  input,
  InputSignal, output,
  OutputEmitterRef, Signal, viewChild,
  WritableSignal
} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {oscModType} from '../enums/enums';
import {MatrixControlSettings} from '../settings/matrix';
import {FmSynthService} from '../services/fm-synth-service';

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
  carrierNum: InputSignal<number> = input.required<number>();
  modulatorNum: InputSignal<number> = input.required<number>();
  signalSelectOperator: InputSignal<WritableSignal<number>> = input.required<WritableSignal<number>>();

  modSelection: OutputEmitterRef<ModSetting> = output<ModSetting>();
  modLevel: OutputEmitterRef<ModLevel> = output<ModLevel>();

  modSelect: Signal<ElementRef<HTMLFormElement>> = viewChild.required<ElementRef<HTMLFormElement>>('modSelect');
  levelControl: Signal<LevelControlComponent> = viewChild.required<LevelControlComponent>('level');
  fmSynthService: FmSynthService = inject(FmSynthService);
  started = false;


  start(ctrlSettings: MatrixControlSettings, modIndex: number, carrierIndex: number) {
    if(!this.started) {
      this.started = true;
      this.ctlSettings = ctrlSettings;
      this.fmSynthService.setModLevel(modIndex, carrierIndex, ctrlSettings.level * 0.1);
     // console.log(modIndex, carrierIndex, ctrlSettings.setting)
      this.fmSynthService.setModType(modIndex, carrierIndex, ctrlSettings.setting);
      //this.levelControl().setValue(ctrlSettings.level);
    }
  }

  protected setModLevel(modBank: number, carrierbank: number, level: number) {
   this.fmSynthService.setModLevel(modBank, carrierbank, level * 0.1);
    this.ctlSettings.level = level;
  }

  public setModType(modType: oscModType) {
    const elements = this.modSelect().nativeElement.elements;
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
    this.levelControl().changeStyle(this.dialStyle);
    this.fmSynthService.setModType(this.modulatorNum(), this.carrierNum(), modType)
    this.modSelection.emit({modType: modType, carrier: this.carrierNum(), modulator: this.modulatorNum()});
  }

  protected selectOperator(modulatorNum: number) {
      this.signalSelectOperator().set(modulatorNum);
  }

  ngAfterViewInit(): void {
    const modSelect = this.modSelect().nativeElement;
    for (let j = 0; j < modSelect.elements.length; ++j) {
      modSelect.elements[j].addEventListener('change', ($event) => {
        const target = $event.target as HTMLInputElement;
        const checked = target.checked;
        const value: oscModType = checked ? target.value as oscModType : oscModType.off;
        const otherCheckBox = (j+1) % 2;
        if(checked)
          (modSelect.elements[otherCheckBox] as HTMLInputElement).checked = false;
        this._setModType(value);
      });
    }
  }

}
