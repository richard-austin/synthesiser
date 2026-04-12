import {AfterViewInit, Component, ElementRef, Input, ViewChild} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';

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

  @ViewChild('modSelect') modSelect!: ElementRef<HTMLFormElement>;
  @ViewChild('level') levelControl!: LevelControlComponent;

  protected setModLevel(level: number) {

  }

  private setModType(modType: "am"|"fm", checked: boolean) {
    if(!checked) {
      this.dialStyle = dialStyle.green;
    } else if (modType === "am") {
      this.dialStyle = dialStyle.magenta;
    } else if (modType === "fm") {
      this.dialStyle = dialStyle.red;
    }
    this.levelControl.changeStyle(this.dialStyle)
  }

  ngAfterViewInit(): void {
    const modSelect = this.modSelect.nativeElement;
    for (let j = 0; j < modSelect.elements.length; ++j) {
      modSelect.elements[j].addEventListener('change', ($event) => {
        const target = $event.target as HTMLInputElement;
        const value: "am"|"fm" = target.value as "am"|"fm";
        const checked = target.checked;

        const otherCheckBox = (j+1) % 2;
        if(checked)
          (modSelect.elements[otherCheckBox] as HTMLInputElement).checked = false;
        this.setModType(value, checked);
      });
    }
  }
}
