import {ADSRValues} from './adsrvalues';

export class FreqBendValues extends ADSRValues {
  private readonly _attackLevel: number;
  constructor(attackTime: number,
              attackLevel: number,
              decayTime: number,
              sustainLevel: number,
              releaseTime: number,
              isExponential: boolean = false) {
    super(attackTime, decayTime, sustainLevel, releaseTime, isExponential);
    if(attackLevel < sustainLevel) {
      throw new DOMException("attackLevel must be >= sustainLevel");
    }
    this._attackLevel = attackLevel;
  }

  get attackLevel() {
    return this._attackLevel;
  }
}
