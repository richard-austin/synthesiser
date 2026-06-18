import {Subscription, timer} from 'rxjs';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {OscFilterBase} from './osc-filter-base';
import {OscillatorWithPhaseMod} from './modulation/oscillator-with-phase-mod';

export class PitchEnvelope {
  device: OscillatorWithPhaseMod | BiquadFilterNode;
  private freqBendEnv: FreqBendValues;
  readonly freqBendBase:number;
  freqBendEnvTimerSub!: Subscription;
  freq = 0;

  constructor (device: OscillatorWithPhaseMod | BiquadFilterNode, freqBendBase: number = 2) {
    this.freqBendBase = freqBendBase;
    this.device = device;
    this.freqBendEnv = new FreqBendValues(0, 0, 0, 0, 0, 0);
  }

  keyDown(frequency: number) {
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
