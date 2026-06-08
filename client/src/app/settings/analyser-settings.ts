import {analyserTypes} from '../enums/enums';

export class AnalyserSettings {
  analyserType: analyserTypes;
  triggerLevel: number;
  xScale: number;
  yScale: number;


  constructor(analyserType: analyserTypes = analyserTypes.off, triggerLevel: number = 0, xScale: number = 1, yScale: number = 1) {
    this.analyserType = analyserType;
    this.triggerLevel = triggerLevel;
    this.xScale = xScale;
    this.yScale = yScale;
  }
}
