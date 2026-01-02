import {GainEnvelopeBase} from '../gain-envelope-base';

export class PinkNoise extends GainEnvelopeBase {
  public static theNode: AudioWorkletNode | undefined = undefined;

  constructor(audioCtx: AudioContext) {
    super(audioCtx);
  }

  async start() {
    function worklet() {
      // @ts-ignore
      registerProcessor('pink-noise', class Processor extends AudioWorkletProcessor {
        static get parameterDescriptors() {
          return [{name: 'amplitude', defaultValue: 0.25, minValue: 0, maxValue: 1}];
        }

        b0 = 0;
        b1 = 0;
        b2 = 0;
        b3 = 0;
        b4 = 0;
        b5 = 0;
        b6 = 0;

        process(inputs: any, outputs: any, parameters: any) {
          const output = outputs[0];

          for (let channel = 0; channel < output.length; ++channel) {
            const outputChannel = output[channel];
            for (let i = 0; i < outputChannel.length; ++i) {
              let white = Math.random() * 2 - 1;
              this.b0 = 0.99886 * this.b0 + white * 0.0555179;
              this.b1 = 0.99332 * this.b1 + white * 0.0750759;
              this.b2 = 0.96900 * this.b2 + white * 0.1538520;
              this.b3 = 0.86650 * this.b3 + white * 0.3104856;
              this.b4 = 0.55000 * this.b4 + white * 0.5329522;
              this.b5 = -0.7616 * this.b5 - white * 0.0168980;
              outputChannel[i] = this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362;
              outputChannel[i] *= 0.11; // (roughly) compensate for gain
              this.b6 = white * 0.115926;
            }
          }
          return true;
        }
      });
    }

    if(PinkNoise.theNode === undefined) {
      await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
      PinkNoise.theNode = new AudioWorkletNode(this.audioCtx, "pink-noise");
    }
    PinkNoise.theNode.connect(this.gain);
  }

  modulation(modulator: OscillatorNode) {
    this.modulator = modulator;
    modulator.connect(this.frequencyMod);
  }

  keyDown(velocity: number) {
    super.attack(velocity);
  }

  keyUp() {
    super.release();
  }
}
