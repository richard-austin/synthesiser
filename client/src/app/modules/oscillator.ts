export class OscillatorParams {
  ringModOutput: "signal" | "mod";
  settingsId: number;

  constructor(ringModOutput: "signal" | "mod", settingsId: number) {
    this.ringModOutput = ringModOutput;
    this.settingsId = settingsId;
  }
}

