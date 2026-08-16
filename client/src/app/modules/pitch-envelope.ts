import {Subscription, timer} from 'rxjs';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {OscFilterBase} from './osc-filter-base';
//import {OscillatorArray} from './modulation/oscillator-with-phase-mod';

export class PitchEnvelope {
  device:/* OscillatorArray |*/ BiquadFilterNode;
  private freqBendEnv: FreqBendValues;
  readonly freqBendBase:number;
  freqBendEnvTimerSub!: Subscription;
  freq = 0;

  constructor (device:/* OscillatorArray |*/ BiquadFilterNode, freqBendBase: number = 2) {
    this.freqBendBase = freqBendBase;
    this.device = device;
    this.freqBendEnv = new FreqBendValues(0, 0, 0, 0, 0, 0);
  }

  sub!: Subscription;

  keyDown(frequency: number) {
    this.sub?.unsubscribe();
    const ctx = this.device.context;
    const freq = this.freq = frequency;
    this.cancelAndHoldAtTime(ctx.currentTime);
    this.device.frequency.setValueAtTime(freq * Math.pow(this.freqBendBase, this.freqBendEnv.releaseLevel), ctx.currentTime);
    this.device.frequency.exponentialRampToValueAtTime(this.clampFrequency(freq * Math.pow(this.freqBendBase, this.freqBendEnv.attackLevel)), ctx.currentTime + this.freqBendEnv.attackTime);
    this.freqBendEnvTimerSub = timer(this.freqBendEnv.attackTime).subscribe(() => {
      this.device.frequency.exponentialRampToValueAtTime(this.clampFrequency(freq * Math.pow(this.freqBendBase, this.freqBendEnv.sustainLevel)), ctx.currentTime + this.freqBendEnv.decayTime);
    });
  }

  keyUp() {
    const ctx = this.device.context;

    this.freqBendEnvTimerSub?.unsubscribe();
    this.cancelAndHoldAtTime(ctx.currentTime);
    this.device.frequency.setValueAtTime(this.device.frequency.value, ctx.currentTime); // Prevent step changes in freq
    this.device.frequency.exponentialRampToValueAtTime(this.clampFrequency(this.freq * Math.pow(this.freqBendBase, this.freqBendEnv.releaseLevel)), ctx.currentTime + this.freqBendEnv.releaseTime);
    // Bring the frequency down to a very low level at the end of envelope as all oscillators  in the bank feed into each filter in the bank since the use of the OscillatorArray
    // TODO: See if this actually improves anything
    this.sub = timer(this.freqBendEnv.releaseTime * 1000).subscribe(() => {
      this.sub.unsubscribe();
      this.device.frequency.exponentialRampToValueAtTime(0.001, ctx.currentTime+2);
    })
  }

  clampFrequency(freq: number): number {
    const maxFrequency = this.device.context.sampleRate / 2;
    return freq < OscFilterBase.minFrequency ? OscFilterBase.minFrequency :
      freq > maxFrequency ? maxFrequency :
        freq;
  }

  setFreqBendEnvelope(envelope: FreqBendValues) {
    this.freqBendEnv = envelope;
    this.device.frequency.setValueAtTime(this.clampFrequency(this.freq * envelope.releaseLevel), this.device.context.currentTime);
  }

  private cancelAndHoldAtTime(time: number) {
    if(this.device.frequency.cancelAndHoldAtTime !== undefined)
      this.device.frequency.cancelAndHoldAtTime(time);
    else {  // Firefox
      const freq = this.device.frequency.value;
      this.device.frequency.cancelScheduledValues(time);
      this.device.frequency.value = freq;
    }
  }
}
