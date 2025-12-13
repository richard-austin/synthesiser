import {onOff} from '../enums/enums';

export class ReverbSettings {
  attackTime: number = 5;
  decayTime: number = 3;
  predelay: number = 0;
  repeatEchoTime: number = 0.7;
  repeatEchoGain: number = 0.3;
  wetDry: number;
  output: onOff;

  // Constructor sets up default values
  constructor(attackTime: number = 0,
              decayTime: number = 2,
              predelayTime: number = 0,
              repeatEchoTime: number = 0.7,
              repeatEchoGain: number = 0.3,
              wetDry: number = -3,
              output: onOff = onOff.off) {
    this.attackTime = attackTime;
    this.decayTime = decayTime;
    this.predelay = predelayTime;
    this.repeatEchoTime = repeatEchoTime;
    this.repeatEchoGain = repeatEchoGain;
    this.wetDry = wetDry;
    this.output = output;
  }
}
