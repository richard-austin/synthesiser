import {DeviceKeys} from '../services/device-pool-manager-service';

export class Chord {
  notes: DeviceKeys[];

  constructor() {
    this.notes = [];
  }
  addNote(keyIndex: DeviceKeys) {
    this.notes.push(keyIndex);
  }

  log(info: string) {
   // for (let i = 0; i < this.notes.length; i++) {
   //   console.log(info+" Note "+ i+1 + " = "+this.notes[i]);
   // }
  }
}
