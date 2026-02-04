export class Chord {
  notes: number[] = [];

  addNote(keyIndex: number) {
    this.notes.push(keyIndex);
  }

  log(info: string) {
   // for (let i = 0; i < this.notes.length; i++) {
   //   console.log(info+" Note "+ i+1 + " = "+this.notes[i]);
   // }
  }
}
