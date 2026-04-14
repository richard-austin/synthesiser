import {oscModType} from '../enums/enums';
import {SynthComponent} from '../synth/synth-component';

export class MatrixControl {
  public setting: oscModType = oscModType.off;
  public level: number = 0;
}

export class MatrixSettings {
  private readonly size = SynthComponent.oscillatorParams.length;

  public readonly matrix: MatrixControl[][];

  constructor() {
    this.matrix =  new Array(this.size);
    for(let i = 0; i < this.size; i++) {
      this.matrix[i] = new Array(this.size);
      for(let j = 0; j < this.size; ++j)
      this.matrix[i][j]= new MatrixControl();
    }
  }
}
