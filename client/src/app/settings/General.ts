export class GeneralSettings {
  level: number;
  configFileName: string = "";

  constructor(level: number = 0.5) {
    this.level = level;
  }
}
