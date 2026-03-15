import {GainEnvelopeBase} from './gain-envelope-base';

export class Phasor {
  filters: BiquadFilterNode[];
  public readonly modInput: GainNode;
  private readonly numberOfNodes: number;
  gain: GainNode;
  private phase: number;
  feedBack: GainNode;
  private spread: number;

  constructor(audioCtx: AudioContext, input: AudioNode, output: AudioNode) {
    this.numberOfNodes = 24;
    this.filters = [];
    this.gain = audioCtx.createGain();
    this.feedBack = audioCtx.createGain();
    this.feedBack.gain.value = 0.0;
    this.spread = 0.5;
    this.phase = 0;

    this.modInput = audioCtx.createGain();
    this.modInput.gain.value = 200000;
    for(let i = 0; i < this.numberOfNodes; ++i) {
      this.filters.push(audioCtx.createBiquadFilter());
      if(i > 0)
        this.filters[i-1].connect(this.filters[i]);

      this.filters[i].type = "allpass";
      this.filters[i].Q.value =0.05;

      this.modInput.connect(this.filters[i].detune);
    }
    input.connect(this.gain);
    input.connect(this.filters[0]);
    this.feedBack.connect(this.filters[0]);
    this.filters[this.numberOfNodes-1].connect(this.feedBack);
    this.filters[this.numberOfNodes-1].connect(this.gain);
    this.gain.connect(output);
  }

  // phase is between 0.5 and -0.5
  setPhase(phase: number) {
    this.phase = phase;
    this.filters.forEach((filter, i) => {
      filter.frequency.value = phase * 44000 * ((1-this.spread) + (i+1) * this.spread / this.numberOfNodes) +50;
      console.log(filter.frequency.value);
    })
  }

  setLevel(level: number) {
    this.gain.gain.value = GainEnvelopeBase.exponentiateGain(level);
  }

  setFeedback(feedback: number) {
    this.feedBack.gain.value = feedback;
  }

  setSpread(spread: number) {
    this.spread = spread;
    this.setPhase(this.phase);
  }

}
