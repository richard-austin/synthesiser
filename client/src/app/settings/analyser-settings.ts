import {analyserTypes} from '../enums/enums';

export class AnalyserSettings {
  analyserType: analyserTypes;

  constructor(analyserType: analyserTypes = analyserTypes.off) {
    this.analyserType = analyserType;
  }
}
