import {WaveTable} from './WaveTable';

export class WaveTableDetails {
  name : string;
  value: string;
  waveTable: WaveTable;
  constructor(name: string, value: string, waveTable: WaveTable) {
    this.name = name;
    this.value = value;
    this.waveTable = waveTable;
  }
}
