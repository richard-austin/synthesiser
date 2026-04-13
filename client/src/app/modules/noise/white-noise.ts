import {GainEnvelopeBase} from '../gain-envelope-base';

export class WhiteNoise extends GainEnvelopeBase {
  private gain: GainNode;

  public static theNode: AudioWorkletNode | undefined = undefined;
  constructor(audioCtx: AudioContext) {
    super(audioCtx);
    this.gain = audioCtx.createGain();
    this.gain.connect(this.envelope);
  }

  override setModulation(): void {
    throw new Error("Method not implemented.");
  }

  async start() {
    function worklet() {
      // @ts-ignore
      registerProcessor('white-noise', class Processor extends AudioWorkletProcessor {
        running = true;
        constructor() {
          super();
          // @ts-ignore
          this.port.onmessage = (event) => {
            if (event.data.type === 'shutdown') {
              this.running = false;
              // @ts-ignore
              this.port.close();
            }
          };
        }

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
          return this.running;
        }
      });
    }

    if(WhiteNoise.theNode === undefined) {
      await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
      WhiteNoise.theNode = new AudioWorkletNode(this.audioCtx, "white-noise");
    }
    WhiteNoise.theNode.connect(this.gain);
  }

  setGain(gain: number) {
    this.gain.gain.value = gain;
  }

  keyDown(velocity: number) {
    super.attack(velocity);
  }

  keyUp() {
    super.release();
  }

  public destroy() {
    WhiteNoise.theNode?.port.postMessage({type: 'shutdown'});
    WhiteNoise.theNode?.disconnect();
    WhiteNoise.theNode = undefined;
    this.disconnect();
  }
}
