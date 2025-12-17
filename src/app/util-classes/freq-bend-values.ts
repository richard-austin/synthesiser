import {ADSRValues} from './adsrvalues';

export class FreqBendValues extends ADSRValues {
  attackLevel: number;
  releaseLevel: number;
  constructor(attackTime: number,
              attackLevel: number,
              decayTime: number,
              sustainLevel: number,
              releaseTime: number,
              releaseLevel: number,
              isExponential: boolean = false) {
    super(attackTime, decayTime, sustainLevel, releaseTime, isExponential);
    if(attackLevel < sustainLevel) {
      throw new DOMException("attackLevel must be >= sustainLevel");
    }
    this.attackLevel = attackLevel;
    this.releaseLevel = releaseLevel;
  }
}
