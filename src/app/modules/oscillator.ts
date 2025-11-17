import {ADSRValues} from '../util-classes/adsrvalues';

export class Oscillator {
  oscillator: OscillatorNode;
  gain: GainNode;
  mod: GainNode;
  modLevel: number = 0;
  env: ADSRValues;
  public static readonly maxLevel: number = 1;
  public static readonly maxFrequency = 20000;

  constructor(private audioCtx: AudioContext) {
    this.oscillator = this.audioCtx.createOscillator();
    this.gain = this.audioCtx.createGain();

    this.gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.oscillator.type = "sine";
    // Default ADSR values
    this.env = new ADSRValues(0.0, 10.0, 0.1, 10.0);
    this.oscillator.connect(this.gain);
    this.oscillator.start();

    this.mod = this.audioCtx.createGain();
    this.mod.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.setModLevel(3); // Default modulation depth
  }

  setFrequency(freq: number) {
    const f = freq <= Oscillator.maxFrequency ?
      freq >= 0 ? freq :
        freq : Oscillator.maxFrequency;
    this.oscillator.frequency.setValueAtTime(f, this.audioCtx.currentTime);
    this.mod.gain.setValueAtTime(f * this.modLevel, this.audioCtx.currentTime);
  }

  setAmplitudeEnvelope(env: ADSRValues) {
    this.env = env;
  }

  connect(params: AudioDestinationNode) {
    this.gain.connect(params);
  }

  setType(type: OscillatorType) {
    this.oscillator.type = type;
  }

  modulator!: OscillatorNode;
  modulation(modulator: OscillatorNode) {
    this.modulator = modulator;
    modulator.connect(this.mod);
    this.mod.connect(this.oscillator.frequency);
    this.mod.gain.setValueAtTime(this.oscillator.frequency.value * this.modLevel, this.audioCtx.currentTime);

  }

  modulationOff() {
    if(this.modulator)
      this.modulator.disconnect()
    this.mod.disconnect();
    this.mod.gain.setValueAtTime(0, this.audioCtx.currentTime);
  }

  setModLevel(level: number) {
    this.modLevel = level *Oscillator.maxLevel /100;
    this.mod.gain.setValueAtTime(this.oscillator.frequency.value * this.modLevel, this.audioCtx.currentTime);
  }

  // Key down for this oscillator
  keyDown() {
    this.gain.gain.cancelAndHoldAtTime(this.audioCtx.currentTime);
    this.gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.gain.gain.linearRampToValueAtTime(Oscillator.maxLevel, this.audioCtx.currentTime + this.env.attackTime);
    this.gain.gain.linearRampToValueAtTime(this.env.sustainLevel, this.audioCtx.currentTime + this.env.attackTime + this.env.decayTime);
  }

  // Key released for this oscillator
  keyUp() {
    this.gain.gain.cancelAndHoldAtTime(this.audioCtx.currentTime);
    this.gain.gain.setValueAtTime(this.gain.gain.value, this.audioCtx.currentTime);
    this.gain.gain.linearRampToValueAtTime(0.0, this.audioCtx.currentTime + this.env.releaseTime);
  }
}
