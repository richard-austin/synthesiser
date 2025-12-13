import {ADSRValues} from '../util-classes/adsrvalues';
import {OscFilterBase} from './osc-filter-base';
import {FreqBendValues} from '../util-classes/freq-bend-values';
import {filterModType, oscModType} from '../enums/enums';

export class Oscillator extends OscFilterBase {
  oscillator: OscillatorNode;

  readonly freqBendBase = 1.4;
  constructor(protected override audioCtx: AudioContext) {
    super(audioCtx);
    this.useAmplitudeEnvelope = true;
    this.oscillator = audioCtx.createOscillator();
    this.oscillator.type = "sine";
    // Default ADSR values
    this.env = new ADSRValues(0.0, 1.0, 0.1, 1.0);
    this.oscillator.connect(this.gain);
    this.oscillator.start();

  }

  setFrequency(freq: number) {
    let f = super.clampFrequency(freq);
    this.oscillator.frequency.setValueAtTime(f, this.audioCtx.currentTime);
    this.frequencyMod.gain.setValueAtTime(f * this.modLevel, this.audioCtx.currentTime);
    this.freq = f;
  }

  setType(type: OscillatorType) {
    this.oscillator.type = type;
  }

  modulation(modulator: AudioNode, type: oscModType | filterModType = oscModType.frequency) {
    this.modType = type;
    this.modulator = modulator;
    this.frequencyMod.disconnect();
    this.amplitudeModDepth.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.oscillator.connect(this.gain);
    if( type === oscModType.frequency) {
      modulator.connect(this.frequencyMod);
      this.frequencyMod.connect(this.oscillator.frequency);
      this.frequencyMod.gain.setValueAtTime(this.freq * this.modLevel, this.audioCtx.currentTime);
    }
    else if( type === oscModType.amplitude) {
      modulator.connect(this.amplitudeModDepth);
      this.amplitudeModDepth.gain.setValueAtTime(this.modLevel * 10, this.audioCtx.currentTime);
    }
    else if( type === oscModType.off) {
      this.modulationOff();
    }
  }

  setModLevel(level: number) {
    if(this.modType === oscModType.frequency) {
      this.modLevel = level * OscFilterBase.maxLevel;
      this.frequencyMod.gain.setValueAtTime(this.oscillator.frequency.value * this.modLevel, this.audioCtx.currentTime);
    }
    else {
        this.modLevel = level;
        this.amplitudeModDepth.gain.setValueAtTime(level * 10, this.audioCtx.currentTime);
      }
  }

  override setFreqBendEnvelope(envelope: FreqBendValues) {
    super.setFreqBendEnvelope(envelope);
 //   this.initialFrequencyFactor = envelope.releaseLevel;  // Ensure frequency starts at the level it ends at in the frequency bend envelope.
    this.oscillator.frequency.setValueAtTime(super.clampFrequency(this.freq * envelope.releaseLevel), this.audioCtx.currentTime);
  }

  override useFreqBendEnvelope(useFreqBendEnvelope:boolean) {
    super.useFreqBendEnvelope(useFreqBendEnvelope);
    this.oscillator.frequency.setValueAtTime(super.clampFrequency(this.freq), this.audioCtx.currentTime);
  }

  // Key down for this oscillator
  override keyDown() {
    super.attack();
    const ctx = this.audioCtx;
    if (this._useFreqBendEnvelope) {
      const freq = this.freq;
      this.oscillator.frequency.cancelAndHoldAtTime(ctx.currentTime);
      this.oscillator.frequency.setValueAtTime(freq*Math.pow(this.freqBendBase,this.freqBendEnv.releaseLevel), this.audioCtx.currentTime);
      this.oscillator.frequency.linearRampToValueAtTime(this.clampFrequency(freq * Math.pow(this.freqBendBase,this.freqBendEnv.attackLevel)), ctx.currentTime + this.freqBendEnv.attackTime);
      this.oscillator.frequency.linearRampToValueAtTime(this.clampFrequency(freq * Math.pow(this.freqBendBase, this.freqBendEnv.sustainLevel)), ctx.currentTime + this.freqBendEnv.attackTime + this.freqBendEnv.decayTime);
    }
  }

  // Key released for this oscillator
  keyUp() {
    super.release();
    if (this._useFreqBendEnvelope) {
      this.oscillator.frequency.cancelAndHoldAtTime(this.audioCtx.currentTime);
      this.oscillator.frequency.linearRampToValueAtTime(this.clampFrequency(this.freq*Math.pow(this.freqBendBase, this.freqBendEnv.releaseLevel)), this.audioCtx.currentTime + this.freqBendEnv.releaseTime);
    }
  }

  override disconnect() {
      super.disconnect();
  }
}
