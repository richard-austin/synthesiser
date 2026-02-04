import {Chord} from './chord';
import {Subscription, timer} from 'rxjs';

export class ChordProcessor {
  private loggingChord1: boolean = false;
  private loggingChord2: boolean = false;
  private startChord2: boolean = false;
  private chord1!: Chord;
  private chord2!: Chord;
  private releaseTimerSub!: Subscription;
  private chordCollectionTimerSub!: Subscription;
  private chordReady: boolean = false;
  private continuity: boolean = false;
  private chordProcessorKeyDownCallback!: (prevKeyIndex: number, keyIndex: number) => void;

  private chord1Complete() {
    this.chord2 = new Chord();
    this.chord1.log("Chord 1");
    this.loggingChord1 = false;
    this.startChord2 = true;
  }

  private chord2Complete() {
    this.loggingChord1 = this.loggingChord2 = false;
    this.chord2.log("Chord 2");
  }

  addNote(keyIndex: number) : boolean {
    if(this.releaseTimerSub) {
      this.releaseTimerSub.unsubscribe();
    }

    if (!this.loggingChord1 && !this.loggingChord2 && !this.startChord2) {
      this.loggingChord1 = true;
      this.chordReady = this.chord2 === null;
      this.chord1 = new Chord();
      this.chordCollectionTimerSub = timer(20).subscribe(() => {
        this.chordReady = true; // Chord might be ready now
        this.chordCollectionTimerSub.unsubscribe();
        this.playOutAccumulatedNotes(this.chord2, this.chord1);
      });
    }

    if (this.startChord2) {
      this.chordReady = false;
      this.chordCollectionTimerSub = timer(20).subscribe(() => {
        this.chordReady = true; // Chord might be ready now
        this.chordCollectionTimerSub.unsubscribe();
        this.playOutAccumulatedNotes(this.chord1, this.chord2);
      });

      this.continuity = true;
      this.loggingChord2 = true;
      this.startChord2 = false;
    }

    if (this.loggingChord1) {
      this.chord1.addNote(keyIndex);
    } else if (this.loggingChord2) {
      this.chord2.addNote(keyIndex);
    }
    return this.chordReady;
  }

  release(releaseTime: number) {
    if (this.loggingChord1) {
      this.chord1Complete();
      this.startChord2 = true;
    } else if (this.loggingChord2) {
      this.chord2Complete();
    }
    if(this.releaseTimerSub)
      this.releaseTimerSub.unsubscribe();
    this.releaseTimerSub = timer(releaseTime * 1000 + 0.2).subscribe(() => {
      this.releaseTimerSub.unsubscribe();
      this.reset();
    });
  }

  setStartNote(keyIndex: number, device: OscillatorNode | BiquadFilterNode, keyToFrequency: (keyIndex:number) => number) {
    if(!this.continuity)
      device.frequency.value = keyToFrequency(keyIndex);
    else {
      const startChord = this.loggingChord1 ? this.chord2 : this.chord1;
      const startIndex = startChord.notes.length > 0 ? startChord.notes.pop() : keyIndex;
      if(startChord.notes.length === 0)
        startChord.notes.push(startIndex as number);
      device.frequency.value = keyToFrequency(startIndex as number);
    }
  }

  playOutAccumulatedNotes(lastChord: Chord, thisChord:Chord) {
    if(lastChord)
      lastChord.notes.sort((a, b) => {return a-b});
    thisChord.notes.sort((a, b) => {return a-b});
    for(let i = 0; i < thisChord.notes.length; ++i) {
      if(lastChord && lastChord.notes.length > i)
        this.chordProcessorKeyDownCallback(lastChord.notes[i], thisChord.notes[i]);
      else if(lastChord && lastChord.notes.length > 0)
        this.chordProcessorKeyDownCallback(lastChord.notes[lastChord.notes.length-1], thisChord.notes[i]);
      else
        this.chordProcessorKeyDownCallback(thisChord.notes[i], thisChord.notes[i]);
    }
  }

  setKeyDownCallback(chordProcessorKeyDownCallback: (prevKeyIndex: number, keyIndex: number) => void) {
    this.chordProcessorKeyDownCallback = chordProcessorKeyDownCallback;
  }

  private reset() {
    this.loggingChord1 = this.loggingChord2 = this.startChord2 = this.continuity = false;
  }
}
