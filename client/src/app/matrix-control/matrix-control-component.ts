import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {oscModType} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {MatrixControl} from '../settings/matrix';

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
  @Input() carrier!: number;
  @Input() modulator!: number;
  @Output() modSelection = new EventEmitter<ModSetting>();
  @Output() modLevel = new EventEmitter<ModLevel>();

  @ViewChild('modSelect') modSelect!: ElementRef<HTMLFormElement>;
  @ViewChild('level') levelControl!: LevelControlComponent;

  start(control: MatrixControl) {
    SetRadioButtons.set(this.modSelect, control.setting);
    this.levelControl.setValue(control.level);
  }

  protected setModLevel(level: number) {
    this.modLevel.emit({level: level, carrier: this.carrier, modulator: this.modulator});
  }

  private setModType(modType: oscModType) {
    if(modType === oscModType.off){
      this.dialStyle = dialStyle.green;
    } else if (modType === oscModType.amplitude) {
      this.dialStyle = dialStyle.magenta;
    } else if (modType === oscModType.frequency) {
      this.dialStyle = dialStyle.red;
    }
    this.levelControl.changeStyle(this.dialStyle)
    this.modSelection.emit({modType: modType, carrier: this.carrier, modulator: this.modulator});
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
        this.setModType(value);
      });
    }
  }
}
