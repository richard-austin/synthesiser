export class GeneralSettings {
  level: number;
  configFileName: string = "";
  synthesiserMode: 'mono' | 'poly';  // This parameter is not set in the general component, but in any of the oscillators
  slop: boolean;
  constructor(level: number = 0.5, synthesiserMode: 'mono' | 'poly' = 'poly', slop: boolean = false) {
    this.level = level;
    this.synthesiserMode = synthesiserMode;
    this.slop = slop;
  }
}
