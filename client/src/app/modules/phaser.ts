import {GainEnvelopeBase} from './gain-envelope-base';
import {AllPassFilter} from './all-pass-filter';

export class Phaser {
  filters: AllPassFilter[];
  public readonly modInput: GainNode;
  private readonly numberOfNodes: number;
  gain: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
  feedBack: GainNode;
  private readonly audioCtx: AudioContext;
  private input: AudioNode;

  constructor(audioCtx: AudioContext, input: AudioNode, output: AudioNode, numberOfNodes: number) {
    this.audioCtx = audioCtx;
    this.input = input;
    this.numberOfNodes = numberOfNodes;
    this.filters = [];
    this.gain = audioCtx.createGain();
    this.gain.connect(output);
    this.feedBack = audioCtx.createGain();
    this.feedBack.gain.value = 0.0;

    this.wetGain = audioCtx.createGain();
    this.wetGain.connect(this.gain);
    this.wetGain.gain.value = 0.0;
    this.dryGain = audioCtx.createGain();
    this.dryGain.connect(this.gain);
    this.dryGain.gain.value = 0.0;
    this.input.connect(this.dryGain);
    this.modInput = audioCtx.createGain();
    this.modInput.gain.value = 1;
  }

  async start() {
    for (let i = 0; i < this.numberOfNodes; ++i) {
      this.filters.push(new AllPassFilter(this.audioCtx));
      await this.filters[i].start();
      if (i > 0)
        this.filters[i - 1].connect(this.filters[i].node());
      this.modInput.connect(this.filters[i].mod());
    }
    this.input.connect(this.filters[0].node());
    this.feedBack.connect(this.filters[0].node());
    this.filters[this.numberOfNodes - 1].connect(this.feedBack);
    this.filters[this.numberOfNodes - 1].connect(this.wetGain);
  }

  // phase is between 0.5 and -0.5
  setPhase(phase: number) {
    this.filters.forEach((filter) => {
      const k1 = phase * 4;// * (i + 1) * this.spread / 3;
      filter.setK1(k1);
    })
  }

  setLevel(level: number) {
    this.gain.gain.value = GainEnvelopeBase.exponentiateGain(level);
  }

  setWetDry(wetDry: number) {
    this.wetGain.gain.value = 0.5-wetDry;
    this.dryGain.gain.value = -0.5-wetDry;
  }

  setFeedback(feedback: number) {
    this.feedBack.gain.value = feedback;
  }

  destroy() {
    this.gain.disconnect();
    this.input.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.feedBack.disconnect(this.filters[0].node());
    this.filters[this.numberOfNodes - 1].disconnect();
    this.filters.forEach((filter, i) => {
      this.modInput.disconnect(this.filters[i].mod());
      filter.destroy();
    })
  }
}
