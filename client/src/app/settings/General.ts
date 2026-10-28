export class GeneralSettings {
  level: number;
  configFileName: string = "";
  synthesiserMode: 'mono' | 'poly' = 'poly'

  constructor(level: number = 0.5) {
    this.level = level;
  }
}
