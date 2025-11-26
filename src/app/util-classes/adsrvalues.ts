export class ADSRValues {
  private _attackTime: number;
  private _decayTime: number;
  private _sustainLevel: number;
  private _releaseTime: number;
  private _isExponential: boolean;

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
  set attackTime(attackTime: number) {this._attackTime = attackTime}
  get decayTime() {return this._decayTime}
  set decayTime(decayTime: number) {this._decayTime = decayTime}
  get sustainLevel() {return this._sustainLevel}
  set sustainLevel(sustainLevel: number) {this._sustainLevel = sustainLevel}
  get releaseTime() {return this._releaseTime}
  set releaseTime(releaseTime: number) {this._releaseTime = releaseTime}
  get isExponential() {return this._isExponential}
  set isExponential(isExponential: boolean) {this._isExponential = isExponential}
}
