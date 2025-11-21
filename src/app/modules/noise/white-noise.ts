import {GainEnvelopeBase} from '../gain-envelope-base';

export class WhiteNoise extends GainEnvelopeBase {
  private node!: AudioWorkletNode;
  constructor(audioCtx: AudioContext) {
    super(audioCtx);
  }

  async start() {
    function worklet() {
      // @ts-ignore
      registerProcessor('white-noise', class Processor extends AudioWorkletProcessor {
        static get parameterDescriptors() {
          return [{name: 'amplitude', defaultValue: 0.25, minValue: 0, maxValue: 1}];
        }
        process(inputs: any, outputs: any, parameters: any) {
          const output = outputs[0];

          for (let channel = 0; channel < output.length; ++channel) {
            const outputChannel = output[channel];
            for (let i = 0; i < outputChannel.length; ++i) {
              outputChannel[i] = Math.random() * 2 - 1;

              outputChannel[i] *= 0.5; // (roughly) compensate for gain
            }
          }
          return true;
        }
      });
    }

    await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
    this.node = new AudioWorkletNode(this.audioCtx, "white-noise");
    this.node.connect(this.gain);
  }
  modulation(modulator: OscillatorNode) {
    this.modulator = modulator;
    modulator.connect(this.mod);
  }
}
