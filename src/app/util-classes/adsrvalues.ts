export class ADSRValues {
  private readonly _attackTime: number;
  private readonly _decayTime: number;
  private readonly _sustainLevel: number;
  private readonly _releaseTime: number;
  private readonly _isExponential: boolean;

  constructor(attackTime: number,
              decayTime: number,
              sustainLevel: number,
              releaseTime: number,
              isExponential: boolean = false) {
    this._attackTime = attackTime;
    this._decayTime = decayTime;
    this._sustainLevel = sustainLevel;
    this._releaseTime = releaseTime;
    this._isExponential = isExponential;
  }

  get attackTime() {return this._attackTime}
  get decayTime() {return this._decayTime}
  get sustainLevel() {return this._sustainLevel}
  get releaseTime() {return this._releaseTime}
  get isExponential() {return this._isExponential}
}
