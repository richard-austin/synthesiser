export class WaveshaperSettings {
  drive: number;
  wetDry: number;
  mode: string;
  output: string;

  constructor(drive: number = 0, wetDry: number = 0,
              mode: 'identity' | 'hardClip' | 'softClip' | 'hardClip2' | 'softClip2' = 'identity',
              output: 'off' | 'phaser' | 'reverb' | 'speaker' = 'off') {
    this.drive = drive;
    this.wetDry = wetDry;
    this.mode = mode;
    this.output = output;
  }
}
