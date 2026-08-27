import {Subscription, timer} from 'rxjs';
import {GainEnvelopeBase} from './gain-envelope-base';
import {ADSRValues} from '../util-classes/adsrvalues';

export class Envelope extends GainNode {
  frequency: number = 0;
  env: ADSRValues;
  _minRampTime: number = 0;
  _legatoMode: boolean = false;
  velocity!: number;
  sub!: Subscription;
  releaseFinishedSub!: Subscription | null;

  private readonly justAudible = GainEnvelopeBase.maxLevel / 50;

  constructor(audioCtx: AudioContext) {
    super(audioCtx);
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.gain.value = 1;
  }

  setAmplitudeEnvelope(env: ADSRValues) {
    this.env = env;
    this.gain.setValueAtTime(this.clampLevel(GainEnvelopeBase.minLevel), this.context.currentTime);
  }

  clampLevel(level: number) {
    return level < GainEnvelopeBase.minLevel ? GainEnvelopeBase.minLevel :
      level > GainEnvelopeBase.maxLevel ? GainEnvelopeBase.maxLevel :
        level;
  }

  public set legatoMode(legatoMode: boolean) {
    this._legatoMode = legatoMode;
    let gainToUse = this.clampLevel(GainEnvelopeBase.minLevel);
    this.cancelAndHoldAtTime(this.context.currentTime);
    this.gain.setValueAtTime(this.clampLevel(gainToUse), this.context.currentTime);
  }
  public get legatoMode(): boolean {
    return this._legatoMode;
  }

  // Calculate the minimum envelope time (2 cycles of the relevant frequency) to prevent clicks with fast attack/decay/release
  private minRampTime(frequency: number) {
    this._minRampTime = 1 / frequency;
  }

  private cancelAndHoldAtTime(time: number) {
    if(this.gain.cancelAndHoldAtTime !== undefined) {
      this.gain.cancelAndHoldAtTime(time);
    } else {  // Firefox
      const gain = this.gain.value;
      this.gain.cancelScheduledValues(time);
      this.gain.value = gain;
    }
  }

  public releaseFinished: (() => void) | null = null;

  keyDown(velocity: number, frequency: number = 2000) {
    this.frequency = frequency;
    if (this.releaseFinishedSub)
      this.releaseFinishedSub.unsubscribe();

    this.minRampTime(frequency);
    const currentTime = this.context.currentTime;
    if (!this.legatoMode) {
      this.sub?.unsubscribe();
      this.velocity = Math.pow(velocity / 127, .75);
      this.cancelAndHoldAtTime(currentTime);
      if (this.gain.value < this.justAudible)
        this.gain.value = this.justAudible;
      else
        this.gain.setValueAtTime(this.gain.value, currentTime);  // Prevent clicks
      this.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.maxLevel * this.velocity), currentTime + this.env.attackTime + this._minRampTime); // Ramp to attack level
      this.sub = timer((this.env.attackTime + this._minRampTime) * 1000).subscribe(() => {
        this.gain.exponentialRampToValueAtTime(this.clampLevel(this.env.sustainLevel * this.velocity), this.context.currentTime + this.env.decayTime + this._minRampTime);  // Ramp to sustain level
      });
    } else { // Legato mode
      this.sub?.unsubscribe();
      this.cancelAndHoldAtTime(currentTime);
      this.gain.setValueAtTime(this.gain.value, currentTime);  // Prevent clicks
      this.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.maxLevel), currentTime + this.env.attackTime + this._minRampTime); // Ramp to attack level
    }
  }

  keyUp(frequency: number = 2000) {
    const currentTime = this.context.currentTime;
    this.minRampTime(frequency);
    if (!this.legatoMode) {
      this.sub?.unsubscribe();
      this.cancelAndHoldAtTime(0);
      this.gain.setValueAtTime(this.gain.value, currentTime);  // Prevent clicks
      this.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.minLevel), currentTime + this.env.releaseTime + this._minRampTime);  // Ramp to release level
    } else { // Legato mode
      this.sub = timer((this.env.decayTime + this._minRampTime) * 1000).subscribe(() => {
        this.sub.unsubscribe();
        this.cancelAndHoldAtTime(0);
        this.gain.setValueAtTime(this.gain.value, this.context.currentTime);  // Prevent clicks
        this.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.minLevel), this.context.currentTime + this.env.releaseTime + this._minRampTime);  // Ramp to release level
      })
    }
    if (this.releaseFinished) {
      this.releaseFinishedSub = timer((this._minRampTime + (!this.legatoMode ? this.env.releaseTime : 0)) * 1000 + 0.1).subscribe(() => {
        this.releaseFinishedSub?.unsubscribe();
        this.releaseFinishedSub = null;
        // @ts-ignore
        this.releaseFinished();
      });
    }
  }
}
