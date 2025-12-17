export class ADSRValues {
 attackTime: number;
 decayTime: number;
 sustainLevel: number;
 releaseTime: number;
 isExponential: boolean;

  constructor(attackTime: number,
              decayTime: number,
              sustainLevel: number,
              releaseTime: number,
              isExponential: boolean = false) {
    this.attackTime = attackTime;
    this.decayTime = decayTime;
    this.sustainLevel = sustainLevel;
    this.releaseTime = releaseTime;
    this.isExponential = isExponential;
  }
}
