import {ADSRValues} from '../util-classes/adsrvalues';
import {OscFilterBase} from './osc-filter-base';
import {filterModType, oscModOutput, oscModType} from '../enums/enums';
import {Subscription, timer} from 'rxjs';

class Modulation {
  constructor(carrier: AudioNode, modulator: AudioNode) {
    this.carrier = carrier;
    this.modulator = modulator;
  }

  carrier: AudioNode;
  modulator: AudioNode;
}

export abstract class GainEnvelopeBase {
  protected readonly envelope: GainNode;
  protected readonly modOutput: GainNode;
  frequencyMod: GainNode;
  frequencyModExternal: GainNode;
  amplitudeMod: GainNode;
  amplitudeModDepth: GainNode;
  amplitudeModDepthExternal: GainNode;
  protected modType: oscModType | filterModType;
  protected modOutputType: oscModOutput;
  protected modLevel: number = 0;
  private _legatoMode = false;
  protected readonly freqModGainBase = 1.02;
  env: ADSRValues;
  modulator!: AudioNode;

  public static readonly maxLevel: number = 1;
  public static readonly minLevel: number = 0.000001;

  protected constructor(protected audioCtx: AudioContext) {
    this.envelope = audioCtx.createGain();
    this.envelope.gain.value = 1;

    this.modOutput = new GainNode(this.audioCtx);
    this.modOutput.gain.value = 1;
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.frequencyMod = audioCtx.createGain();
    this.frequencyMod.gain.value = 0;
    this.frequencyModExternal = audioCtx.createGain();
    this.frequencyModExternal.gain.value = 3000;  // Always fixed at 3000 as this is used for external modulation set up on the matrix
    this.amplitudeMod = audioCtx.createGain();
    this.amplitudeMod.gain.value = 1;
    this.amplitudeModDepth = audioCtx.createGain();
    this.amplitudeModDepth.gain.value = 0;
    this.amplitudeModDepthExternal = audioCtx.createGain();
    this.amplitudeModDepthExternal.gain.value = 1;  // Always fixed at one as this is used for external modulation set up on the matrix
    this.envelope.connect(this.amplitudeMod);
    this.amplitudeModDepth.connect(this.amplitudeMod.gain);
    this.amplitudeModDepthExternal.connect(this.amplitudeMod.gain);
    this.modType = oscModType.amplitude;
    this.modOutputType = oscModOutput.direct;
  }

  public static exponentiateGain(gain: number) {
    return (Math.pow(10, gain) - 1) / (Math.pow(10, 1) - 1);
  }

  setAmplitudeEnvelope(env: ADSRValues) {
    this.env = env;
    this.envelope.gain.setValueAtTime(this.clampLevel(OscFilterBase.minLevel), this.audioCtx.currentTime);
  }

  connectModOut(node: AudioNode) {
    this.modOutput.connect(node);
  }

  abstract setModulation(): void;

  private readonly modConnections: Modulation[] = [];

  modulation(modulator: AudioNode, type: oscModType | filterModType) {
    this.modType = type;
    if (modulator) {
      if (type === oscModType.amplitude) {
        if (!this.modConnections.find((mod) => mod.modulator === modulator && mod.carrier === this.amplitudeModDepth)) {
          // modulator.connect(this.frequencyMod);
          modulator.connect(this.amplitudeModDepth);
          this.modConnections.push(new Modulation(this.amplitudeModDepth, modulator));
          // Remove any previous connection from this modulator to the frequencyMod node
          const idx = this.modConnections.findIndex(mod => mod.modulator === modulator && mod.carrier === this.frequencyMod);
          if (idx > -1) {
            modulator.disconnect(this.modConnections[idx].carrier);
            this.modConnections.splice(idx, 1);
          }
        }
      } else if (type === oscModType.frequency) {
        if (!this.modConnections.find((mod) => mod.modulator === modulator && mod.carrier === this.frequencyMod)) {
          // modulator.connect(this.frequencyMod);
          modulator.connect(this.frequencyMod);
          this.modConnections.push(new Modulation(this.frequencyMod, modulator));
          // Remove any previous connection from this modulator to the amplitudeModDepth node
          const idx = this.modConnections.findIndex(mod => mod.modulator === modulator && mod.carrier === this.amplitudeModDepth);
          if (idx > -1) {
            modulator.disconnect(this.modConnections[idx].carrier);
            this.modConnections.splice(idx, 1);
          }
        }
      } else if (type === oscModType.off) {
        const idx = this.modConnections.findIndex((mod) => mod.modulator === modulator);
        if (idx > -1) {
          modulator.disconnect(this.modConnections[idx].carrier);
          this.modConnections.splice(idx, 1);
        }
      }
    }
    this.setModulation();
  }

  modulationExternal(modulator: AudioNode, type: oscModType) {
    if (modulator) {
      if (type === oscModType.amplitude) {
        if (!this.modConnections.find((mod) => mod.modulator === modulator && mod.carrier === this.amplitudeModDepthExternal)) {
          // modulator.connect(this.frequencyModExternal);
          modulator.connect(this.amplitudeModDepthExternal);
          this.modConnections.push(new Modulation(this.amplitudeModDepthExternal, modulator));
          // Remove any previous connection from this modulator to the frequencyModExternal node
          const idx = this.modConnections.findIndex(mod => mod.modulator === modulator && mod.carrier === this.frequencyModExternal);
          if (idx > -1) {
            modulator.disconnect(this.modConnections[idx].carrier);
            this.modConnections.splice(idx, 1);
          }
        }
      } else if (type === oscModType.frequency) {
        if (!this.modConnections.find((mod) => mod.modulator === modulator && mod.carrier === this.frequencyModExternal)) {
          // modulator.connect(this.frequencyModExternal);
          modulator.connect(this.frequencyModExternal);
          this.modConnections.push(new Modulation(this.frequencyModExternal, modulator));
          // Remove any previous connection from this modulator to the amplitudeModDepthExternal node
          const idx = this.modConnections.findIndex(mod => mod.modulator === modulator && mod.carrier === this.amplitudeModDepthExternal);
          if (idx > -1) {
            modulator.disconnect(this.modConnections[idx].carrier);
            this.modConnections.splice(idx, 1);
          }
        }
      } else if (type === oscModType.off) {
        const idx = this.modConnections.findIndex((mod) => mod.modulator === modulator);
        if (idx > -1) {
          modulator.disconnect(this.modConnections[idx].carrier);
          this.modConnections.splice(idx, 1);
        }
      }
    }
  }

  clearModulation(): void {
    this.modConnections.forEach(mod => {
      mod.modulator.disconnect(mod.carrier);
    });
    this.modConnections.splice(0, this.modConnections.length);
  }

  public set legatoMode(legatoMode: boolean) {
    this._legatoMode = legatoMode;
    let gainToUse = this.clampLevel(OscFilterBase.minLevel);
    this.envelope.gain.cancelAndHoldAtTime(this.audioCtx.currentTime);
    this.envelope.gain.setValueAtTime(this.clampLevel(gainToUse), this.audioCtx.currentTime);
  }

  public get legatoMode() {
    return this._legatoMode;
  }

  clampLevel(level: number) {
    return level < GainEnvelopeBase.minLevel ? GainEnvelopeBase.minLevel :
      level > GainEnvelopeBase.maxLevel ? GainEnvelopeBase.maxLevel :
        level;
  }

  private _minRampTime: number = 0.03125;
  sub!: Subscription;
  velocity!: number;
  private readonly justAudible = GainEnvelopeBase.maxLevel / 50;

  attack(velocity: number, frequency: number = 2000) {
    if (this.releaseFinishedSub)
      this.releaseFinishedSub.unsubscribe();

    this.minRampTime(frequency);
    const currentTime = this.audioCtx.currentTime;
    if (!this.legatoMode) {
      this.sub?.unsubscribe();
      this.velocity = Math.pow(velocity / 127, .75);
      this.envelope.gain.cancelAndHoldAtTime(currentTime);
      if (this.envelope.gain.value < this.justAudible)
        this.envelope.gain.value = this.justAudible;
      else
        this.envelope.gain.setValueAtTime(this.envelope.gain.value, currentTime);  // Prevent clicks
      this.envelope.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.maxLevel * this.velocity), currentTime + this.env.attackTime + this._minRampTime); // Ramp to attack level
      this.sub = timer((this.env.attackTime + this._minRampTime) * 1000).subscribe(() => {
        this.envelope.gain.exponentialRampToValueAtTime(this.clampLevel(this.env.sustainLevel * this.velocity), this.audioCtx.currentTime + this.env.decayTime + this._minRampTime);  // Ramp to sustain level
      });
    } else { // Legato mode
      this.sub?.unsubscribe();
      this.envelope.gain.cancelAndHoldAtTime(currentTime);
      this.envelope.gain.setValueAtTime(this.envelope.gain.value, currentTime);  // Prevent clicks
      this.envelope.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.maxLevel), currentTime + this.env.attackTime + this._minRampTime); // Ramp to attack level
    }
  }

  private releaseFinishedSub: Subscription | null = null;
  public releaseFinished: (() => void) | null = null;

  release(frequency: number = 2000) {
    const currentTime = this.audioCtx.currentTime;
    this.minRampTime(frequency);
    if (!this.legatoMode) {
      this.sub?.unsubscribe();
      this.envelope.gain.cancelAndHoldAtTime(0);
      this.envelope.gain.setValueAtTime(this.envelope.gain.value, currentTime);  // Prevent clicks
      this.envelope.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.minLevel), currentTime + this.env.releaseTime + this._minRampTime);  // Ramp to release level
    } else { // Legato mode
      this.sub = timer((this.env.decayTime + this._minRampTime) * 1000).subscribe(() => {
        this.sub.unsubscribe();
        this.envelope.gain.cancelAndHoldAtTime(0);
        this.envelope.gain.setValueAtTime(this.envelope.gain.value, this.audioCtx.currentTime);  // Prevent clicks
        this.envelope.gain.exponentialRampToValueAtTime(this.clampLevel(GainEnvelopeBase.minLevel), this.audioCtx.currentTime + this.env.releaseTime + this._minRampTime);  // Ramp to release level
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

  // Calculate the minimum envelope time (2 cycles of the relevant frequency) to prevent clicks with fast attack/decay/release
  private minRampTime(frequency: number) {
    this._minRampTime = 5 / frequency;
  }

  connect(arg: AudioNode | AudioParam) {
    if (arg instanceof AudioNode)
      this.amplitudeMod.connect(arg);
    else if (arg instanceof AudioParam)
      this.amplitudeMod.connect(arg);
  }

  disconnect() {
    this.amplitudeMod.disconnect();
   // this.modOutput.disconnect();
  }
}
