import {GainEnvelopeBase} from './gain-envelope-base';

export class Phaser {
  filters: BiquadFilterNode[];
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
    this.feedBack.gain.value = 0.1;

    this.wetGain = audioCtx.createGain();
    this.wetGain.connect(this.gain);
    this.wetGain.gain.value = 0.0;
    this.dryGain = audioCtx.createGain();
    this.dryGain.connect(this.gain);
    this.dryGain.gain.value = 0.0;
    this.input.connect(this.dryGain);
    this.modInput = audioCtx.createGain();
    this.modInput.gain.value = 9600; // Sweep range of 8 octaves in cents
  }

  async start() {
    let stagger = 0;
    for (let i = 0; i < this.numberOfNodes; ++i) {
      this.filters.push(new BiquadFilterNode(this.audioCtx));
      this.filters[i].type = "allpass";
      this.filters[i].detune.value = stagger;
      stagger -= 100;
      if (i > 0)
        this.filters[i - 1].connect(this.filters[i]);
      this.modInput.connect(this.filters[i].detune);
    }
    this.input.connect(this.filters[0]);
    if(navigator.userAgent.indexOf("Firefox") == -1) {
      // Feedback causes muting with Firefox
      this.feedBack.connect(this.filters[0]);
      this.filters[this.numberOfNodes - 1].connect(this.feedBack);
    }
    this.filters[this.numberOfNodes - 1].connect(this.wetGain);
  }

  setFrequency(frequency: number) {
    const twelfthRoot2 = Math.pow(2, 1 / 12);

    this.filters.forEach((filter) => {
      filter.frequency.value = Math.pow(twelfthRoot2, frequency * 144) * 8;  // Range of 12 octaves in semitones
    })
  }
  setQFactor(q: number) {
    this.filters.forEach((filter) => {
      filter.Q.value = q;
    });
  }
  setLevel(level: number) {
    this.gain.gain.value = GainEnvelopeBase.exponentiateGain(level);
  }

  setWetDry(wetDry: number) {
    this.wetGain.gain.value = 0.5 - wetDry;
    this.dryGain.gain.value = -0.5 - wetDry;
  }

  setFeedback(feedback: number) {
    this.feedBack.gain.value = feedback;
  }

  destroy() {
    this.gain.disconnect();
    this.input.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    if(navigator.userAgent.indexOf("Firefox") == -1)
      this.feedBack.disconnect(this.filters[0]);
    this.filters[this.numberOfNodes - 1].disconnect();
    this.filters.forEach((filter) => {
      this.modInput.disconnect(filter.detune);
    });
  }
}
