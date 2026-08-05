import {Chord} from './chord';
import {Subscription, timer} from 'rxjs';
//import {Oscillator} from './oscillator';
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
  private inChord1Timer: boolean = false;
  private inChord2Timer: boolean = false;

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
      this.inChord1Timer = true;
      this.chordCollectionTimerSub = timer(20).subscribe(() => {
        this.inChord1Timer = false;
        this.chordReady = true; // Chord might be ready now
        this.chordCollectionTimerSub.unsubscribe();
        this.playOutAccumulatedNotes(this.chord2, this.chord1);
      });
    }

    if (this.startChord2) {
      this.chordReady = false;
      this.inChord2Timer = true;
      this.chordCollectionTimerSub = timer(20).subscribe(() => {
        this.inChord2Timer = false;
        this.chordReady = true;
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
    if (this.inChord1Timer) {
      this.chord1.notes = [];  // If keyup occurred before chord 1 timer had completed
    } else if (this.inChord2Timer) {
      this.chord2.notes = []; // If keyup occurred before chord 2 timer had completed
    } else {  // Chord gathering timeout completed
      if (this.loggingChord1) {
        this.chord1Complete();
        this.startChord2 = true;
      } else if (this.loggingChord2) {
        this.chord2Complete();
      }    // if (keys !== undefined && this.proxySettings.portamento > 0) {
    //   this.cancelAndHoldAtTime(this.audioCtx.currentTime, this.oscillators[keys.deviceIndex].oscillator.frequency);
    //   const proxySettings = this.proxySettings;
    //   switch (proxySettings.portamentoType) {
    //     case 'chord':
    //       if (!this.chordProcessor.addNote(structuredClone(keys)))
    //         return;  // Less than the minimum time flor a chord
    //       this.chordProcessor.setStartNote(keys, this.oscillators[keys.deviceIndex], this.keyToFrequency);
    //       break;
    //     case 'last':
    //       if (lastKey)
    //         this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(lastKey.keyIndex);
    //       break;
    //     case 'first':
    //       const firstKeys = this.keysDown[0];
    //       this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(firstKeys.keyIndex);
    //       break;
    //     case 'lowest':
    //       const lowestKey = Math.min(...this.keysDown.map(keys => keys.keyIndex));
    //       if (lowestKey !== undefined)
    //         this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(lowestKey);
    //       break;
    //     case 'highest':
    //       const highestKey = Math.max(...this.keysDown.map(keys => keys.keyIndex));
    //       this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(highestKey);
    //       break;
    //     case 'plus12':
    //       this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(keyIndex) * 2;
    //       break;
    //     case 'plus24':
    //       this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(keyIndex) * 4;
    //       break;
    //     case 'minus12':
    //       this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(keyIndex) / 2;
    //       break;
    //     case 'minus24':
    //       this.oscillators[keys.deviceIndex].oscillator.frequency.value = this.keyToFrequency(keyIndex) / 4;
    //       break;
    //   }
    //
    //   this.oscillators[keys.deviceIndex].oscillator.frequency.exponentialRampToValueAtTime(freq, this.audioCtx.currentTime + this.proxySettings.portamento);
    // }

      if (this.releaseTimerSub)
        this.releaseTimerSub.unsubscribe();
      this.releaseTimerSub = timer(releaseTime * 1000).subscribe(() => {
        this.releaseTimerSub.unsubscribe();
        this.reset();
      });
    }
  }

  playOutAccumulatedNotes(lastChord: Chord, thisChord: Chord) {
    if (lastChord) {
      //console.log("lastChord " + lastChord.notes.length + " notes found");
      lastChord.notes.sort((a, b) => {
        return a.keyIndex - b.keyIndex
      });
    }

    // console.log("thisChord " + thisChord.notes.length + " notes found");
    thisChord.notes.sort((a, b) => {
      return a.keyIndex - b.keyIndex
    });

    for (let i = 0; i < thisChord.notes.length; ++i) {
      if (lastChord && lastChord.notes.length > 1) {
        // // Use same device in notes change to glide between notes without leaving the original in place
        // for (let j = 0; j < thisChord.notes.length && j < lastChord.notes.length; j++)
        //   thisChord.notes[j].deviceIndex = lastChord.notes[j].deviceIndex;

        this.chordProcessorKeyDownCallback(lastChord.notes.shift() as DeviceKeys, thisChord.notes[i]);
      } else if (lastChord && lastChord.notes.length === 1) {
        // // Use same device in note change to glide between notes without leaving the original in place
        // thisChord.notes[0].deviceIndex = lastChord.notes[0].deviceIndex;

        this.chordProcessorKeyDownCallback(lastChord.notes[0], thisChord.notes[i]);
      } else
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
