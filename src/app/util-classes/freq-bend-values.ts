import {ADSRValues} from './adsrvalues';

export class FreqBendValues extends ADSRValues {
  private readonly _attackLevel: number;
  private readonly _releaseLevel: number;
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
    this._attackLevel = attackLevel;
    this._releaseLevel = releaseLevel;
  }

  get attackLevel() {
    return this._attackLevel;
  }
  get releaseLevel() {
    return this._releaseLevel;
  }
}
