import {ADSRValues} from '../util-classes/adsrvalues';
import {filterModType, oscModOutput, oscModType} from '../enums/enums';
import {Envelope} from './envelope';

class Modulation {
  constructor(carrier: AudioNode, modulator: AudioNode) {
    this.carrier = carrier;
    this.modulator = modulator;
  }

  carrier: AudioNode;
  modulator: AudioNode;
}

export abstract class GainEnvelopeBase {
  protected readonly gain: GainNode;
  protected readonly envelope: Envelope;
  protected readonly modOutput: GainNode;
  frequencyModInternal: GainNode;
  phaseModExternal: GainNode;
  amplitudeMod: GainNode;
  amplitudeModDepth: GainNode;
  amplitudeModDepthExternal: GainNode;
  protected modType: oscModType | filterModType;
  protected modOutputType: oscModOutput;
  protected modLevel: number = 0;
  protected readonly freqModGainBase = 1.02;
  modulator!: AudioNode;
  protected frequency:number = 400;

  public static readonly maxLevel: number = 1;
  public static readonly minLevel: number = 0.000001;

  protected constructor(protected audioCtx: AudioContext) {
    this.gain = audioCtx.createGain();
    this.envelope = new Envelope(audioCtx);

    this.modOutput = new GainNode(this.audioCtx);
    this.modOutput.gain.value = 1;
    this.frequencyModInternal = audioCtx.createGain();
    this.frequencyModInternal.gain.value = 0;
    this.phaseModExternal = audioCtx.createGain();
    this.phaseModExternal.gain.value = 0.3;
    this.amplitudeMod = audioCtx.createGain();
    this.amplitudeMod.gain.value = 1;
    this.amplitudeModDepth = audioCtx.createGain();
    this.amplitudeModDepth.gain.value = 0;
    this.amplitudeModDepthExternal = audioCtx.createGain();
    this.amplitudeModDepthExternal.gain.value = 1;  // Always fixed at one as this is used for external modulation set up on the matrix
    this.amplitudeMod.connect(this.envelope);
    this.envelope.connect(this.gain);
    this.amplitudeModDepth.connect(this.amplitudeMod.gain);
    this.amplitudeModDepthExternal.connect(this.amplitudeMod.gain);
    this.modType = oscModType.amplitude;
    this.modOutputType = oscModOutput.direct;
  }

  public static exponentiateGain(gain: number) {
    return (Math.pow(10, gain) - 1) / (Math.pow(10, 1) - 1);
  }

  setGain(gain: number) {
    this.gain.gain.value = gain;
  }

  setAmplitudeEnvelope(env: ADSRValues) {
    this.envelope.setAmplitudeEnvelope(env);
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
          const idx = this.modConnections.findIndex(mod => mod.modulator === modulator && mod.carrier === this.frequencyModInternal);
          if (idx > -1) {
            modulator.disconnect(this.modConnections[idx].carrier);
            this.modConnections.splice(idx, 1);
          }
        }
      } else if (type === oscModType.frequency) {
        if (!this.modConnections.find((mod) => mod.modulator === modulator && mod.carrier === this.frequencyModInternal)) {
          // modulator.connect(this.frequencyMod);
          modulator.connect(this.frequencyModInternal);
          this.modConnections.push(new Modulation(this.frequencyModInternal, modulator));
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
          const idx = this.modConnections.findIndex(mod => mod.modulator === modulator && mod.carrier === this.phaseModExternal);
          if (idx > -1) {
            modulator.disconnect(this.modConnections[idx].carrier);
            this.modConnections.splice(idx, 1);
          }
        }
      } else if (type === oscModType.frequency) {
        if (!this.modConnections.find((mod) => mod.modulator === modulator && mod.carrier === this.phaseModExternal)) {
          // modulator.connect(this.frequencyModExternal);
          modulator.connect(this.phaseModExternal);
          this.modConnections.push(new Modulation(this.phaseModExternal, modulator));
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
    this.envelope.legatoMode = legatoMode;
  }

  public get legatoMode() {
    return this.envelope.legatoMode;
  }

  attack(velocity: number, frequency: number = 2000) {
    this.envelope.keyDown(velocity, frequency);
  }

  release(frequency: number = 2000) {
    this.envelope.keyUp(frequency);
  }

  connect(arg: AudioNode | AudioParam) {
    if (arg instanceof AudioNode)
      this.gain.connect(arg);
    else if (arg instanceof AudioParam)
      this.gain.connect(arg);
  }

  disconnect() {
    this.gain.disconnect();
  }
}
