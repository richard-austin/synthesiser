import { Component } from '@angular/core';
import {MatrixControlComponent} from '../matrix-control/matrix-control-component';
import {SynthComponent} from '../synth/synth-component';

@Component({
  selector: 'app-matrix',
  imports: [
    MatrixControlComponent
  ],
  templateUrl: './matrix-component.html',
  styleUrl: './matrix-component.scss',
})
export class MatrixComponent {
  protected _oscillatorParams = SynthComponent.oscillatorParams;

}
