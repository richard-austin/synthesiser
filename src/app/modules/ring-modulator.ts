export class RingModulator {
  private readonly _ringMod: GainNode;
  private readonly modulator: OscillatorNode;
  private readonly _gainNode: GainNode;

  constructor(private audioCtx: AudioContext) {
    this._ringMod = audioCtx.createGain();
    this._ringMod.gain.setValueAtTime(1, this.audioCtx.currentTime);
    this.modulator = audioCtx.createOscillator();
    this._gainNode = audioCtx.createGain();
    this.modulator.type = "sine";
    this.modulator.connect(this._gainNode);
    this.modulator.frequency.value = 0;
    this.modulator.connect(this._gainNode);
    this.modulator.start();
  }

  signalInput(): AudioNode {
    return this._ringMod;
  }

  modInput(): AudioParam {
    return this._ringMod.gain;
  }

  setModFrequency(freq: number): void {
    this.modulator.frequency.setValueAtTime(freq *5, this.audioCtx.currentTime);
  }

  setModDepth(depth: number) {
    this._gainNode.gain.setValueAtTime(depth * 2, this.audioCtx.currentTime);
  }

  setModWaveform(value: OscillatorType) {
    this.modulator.type = value;
  }

  setGain(gain: number) {
    this._ringMod.gain.setValueAtTime(gain, this.audioCtx.currentTime);
  }

  internalMod(enable: boolean) {
    if(enable) {
      this._gainNode.connect(this.modInput());
    }
    else {
      this._gainNode.disconnect();
    }
  }

  connect(node: AudioNode) {
    this._ringMod.connect(node);
  }

  disconnect() {
    this._ringMod.disconnect();
  }
}
