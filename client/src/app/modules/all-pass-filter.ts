export class AllPassFilter {
  private _node: AudioWorkletNode | undefined = undefined;
  private readonly audioCtx: AudioContext;

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
  }

  async start() {
    function worklet() {
      // @ts-ignore
      registerProcessor('all-pass', class Processor extends AudioWorkletProcessor {
        static get parameterDescriptors() {
          return [{name: 'k1', defaultValue: 0, minValue: -.999, maxValue:1}];
        }

        k1 = 0;
        zMiOne = 0;
        running = true;

        constructor() {
          super();
          // @ts-ignore
          this.port.onmessage = (event) => {
            if (event.data.type === 'shutdown') {
              this.running = false;
            }
          };
        }

        process(inputs: any, outputs: any, parameters: any) {
          this.k1 = parameters["k1"][0];
          const output = outputs[0];
          const input = inputs[0];
          for (let channel = 0; channel < input.length; ++channel) {
            const outputChannel = output[channel];
            const inputChannel = input[channel];
            for (let i = 0; i < outputChannel.length; ++i) {
              outputChannel[i] = this.zMiOne + (inputChannel[i] -this.zMiOne * this.k1) * this.k1;
              this.zMiOne = inputChannel[i] - this.k1 * this.zMiOne;
            }
          }
          return this.running;
        }
      });
    }

    if (this._node === undefined) {
      await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
      this._node = new AudioWorkletNode(this.audioCtx, "all-pass");
    }
  }

  public connect(node: AudioNode) {
    this._node?.connect(node);
  }

  public node() : AudioNode {
    return this._node as AudioNode;
  }

  public setK1(k1: number) {
    if(k1 > 3)
      k1 = 3;
    else if(k1 < -3)
      k1 = -3;

    this._node?.parameters.get("k1")?.setValueAtTime(k1, 0);
  }
  public mod(): AudioParam {
    return this._node?.parameters.get("k1") as AudioParam;
  }

  public disconnect() {
    this._node?.disconnect();
  }

  public destroy() {
    this._node?.port.postMessage({type: 'shutdown'});
    this.disconnect();
  }
}
