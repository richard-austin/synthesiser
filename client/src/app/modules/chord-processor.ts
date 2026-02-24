import {Chord} from './chord';
import {Subscription, timer} from 'rxjs';
import {Oscillator} from './oscillator';
import {Filter} from './filter';
import {DeviceKeys} from '../services/device-pool-manager-service';

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
  private chordProcessorKeyDownCallback!: ((prevKeyIndex: DeviceKeys, theseKeys: DeviceKeys) => void);

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

  addNote(keys: DeviceKeys): boolean {
    if (this.releaseTimerSub) {
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
      this.chord1.addNote(keys);
    } else if (this.loggingChord2) {
      this.chord2.addNote(keys);
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
    if (this.releaseTimerSub)
      this.releaseTimerSub.unsubscribe();
    this.releaseTimerSub = timer(releaseTime * 1000 + 0.2).subscribe(() => {
      this.releaseTimerSub.unsubscribe();
      this.reset();
    });
  }

  setStartNote(keys: DeviceKeys, device: Oscillator | Filter, keyToFrequency: (keyIndex: number) => number) {
    if (!this.continuity) {
      if (device instanceof Oscillator)
        device.oscillator.frequency.value = keyToFrequency(keys.keyIndex);
      else
        device.filter.frequency.value = device.filter2.frequency.value = keyToFrequency(keys.keyIndex);
    } else {
      const startChord = this.loggingChord1 ? this.chord2 : this.chord1;
      const startKeys = startChord.notes.length > 0 ? startChord.notes.pop() : keys;
      if (startChord.notes.length === 0)
        startChord.notes.push(startKeys as DeviceKeys);
      if (device instanceof Oscillator)
        device.oscillator.frequency.value = keyToFrequency(startKeys?.keyIndex as number);
      else
        device.filter.frequency.value = device.filter2.frequency.value = keyToFrequency(startKeys?.keyIndex as number);
    }
  }

  playOutAccumulatedNotes(lastChord: Chord, thisChord: Chord) {
    if (lastChord) {
      console.log("lastChord " + lastChord.notes.length + " notes found");
      lastChord.notes.sort((a, b) => {
        return a.keyIndex - b.keyIndex
      });
    }

    console.log("thisChord " + thisChord.notes.length + " notes found");
    thisChord.notes.sort((a, b) => {
      return a.keyIndex - b.keyIndex
    });

    for (let i = 0; i < thisChord.notes.length; ++i) {
      if (lastChord && lastChord.notes.length > 1)
        this.chordProcessorKeyDownCallback(lastChord.notes.shift() as DeviceKeys, thisChord.notes[i]);
      else if (lastChord && lastChord.notes.length === 1)
        this.chordProcessorKeyDownCallback(lastChord.notes[0], thisChord.notes[i]);
      else
        this.chordProcessorKeyDownCallback(thisChord.notes[i], thisChord.notes[i]);
    }
  }

  setKeyDownCallback(chordProcessorKeyDownCallback: (prevKeyIndex: DeviceKeys, theseKeys: DeviceKeys) => void) {
    this.chordProcessorKeyDownCallback = chordProcessorKeyDownCallback;
  }

  private reset() {
    this.loggingChord1 = this.loggingChord2 = this.startChord2 = this.continuity = false;
  }
}
