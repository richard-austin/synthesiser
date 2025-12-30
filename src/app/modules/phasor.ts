import {GainEnvelopeBase} from './gain-envelope-base';

export class Phasor {
  delay1: DelayNode;
  delay2: DelayNode;
  gain: GainNode;

  constructor(audioCtx: AudioContext, input: AudioNode, output: AudioNode) {
    this.delay1 = audioCtx.createDelay();
    this.delay2 = audioCtx.createDelay();
    this.gain = audioCtx.createGain();

    this.delay1.delayTime.value = 0
    this.delay2.delayTime.value = 0
    this.delay1.connect(this.gain);
    this.delay2.connect(this.gain);
    input.connect(this.delay1);
    input.connect(this.delay2);
    this.gain.connect(output);
  }

  // phase is between 0.5 and -0.5
  setPhase(phase: number) {
    if(phase > 0) {
      this.delay2.delayTime.value = 0;
      this.delay1.delayTime.value = phase;
    } else {
      this.delay1.delayTime.value = 0;
      this.delay2.delayTime.value = -phase;
    }
  }

  setLevel(level: number) {
    this.gain.gain.value = GainEnvelopeBase.exponentiateGain(level);
  }
}
