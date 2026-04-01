export class AllPassFilter2ndOrd {
  private _node: AudioWorkletNode | undefined = undefined;
  private readonly audioCtx: AudioContext;

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
  }

  async start() {
    // See https://thewolfsound.com/allpass-filter/#implementation
    function worklet() {
      // @ts-ignore
      registerProcessor('all-pass2', class Processor extends AudioWorkletProcessor {
        static get parameterDescriptors() {
          return [{name: 'c', defaultValue: 0, minValue: -0.999, maxValue:0.999, automationRate: "k-rate"}, {name: 'd', defaultValue: 0, minValue: -0.999, maxValue:0.999, automationRate: "k-rate"}];
        }

        c = 0;
        d = 0;
        zMiOne = [0,0];
        zMiTwo = [0,0];

        running = true;

        lastC = 0;
        lastD = 0;

        constructor() {
          super();
          // @ts-ignore
          this.port.onmessage = (event) => {
            if (event.data.type === 'shutdown') {
              this.running = false;
              // @ts-ignore
              this.port.close();
              console.log("Closed");
            }
          };
        }

        process(inputs: any, outputs: any, parameters: any) {
          this.c = parameters["c"][0];
          this.d = parameters["d"][0];

          const output = outputs[0];
          const input = inputs[0];

          let sum1;
          let sum2;
          let sum3;
          let sum4;

          for (let channel = 0; channel < input.length; ++channel) {
            const outputChannel = output[channel];
            const inputChannel = input[channel];
            for (let i = 0; i < outputChannel.length; ++i) {
              sum2 = this.zMiOne[channel] * -this.d*(1 - this.c);
              sum2 += this.zMiTwo[channel] * this.c;
              sum1 = inputChannel[i];
              sum1 += sum2;

              sum4 = this.zMiTwo[channel];
              sum4 += this.zMiOne[channel] * this.d*(1 - this.c);
              sum3 = sum1 * -this.c;
              sum3 += sum4;

              outputChannel[i] = sum3;
              this.zMiTwo[channel] = this.zMiOne[channel];
              this.zMiOne[channel] = sum1;
            }
          }
          return this.running;
        }
      });
    }

    if (this._node === undefined) {
      await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
      this._node = new AudioWorkletNode(this.audioCtx, "all-pass2");
    }
  }

  public connect(node: AudioNode) {
    this._node?.connect(node);
  }

  public node() : AudioNode {
    return this._node as AudioNode;
  }

  // Bandwidth
  public setC(c: number) {
     this._node?.parameters.get("c")?.setValueAtTime(c, 0);
  }

  // Phase / frequency
  public setD(d: number) {
    this._node?.parameters.get("d")?.setValueAtTime(d, 0);
  }
  public mod(): AudioParam {
    return this._node?.parameters.get("d") as AudioParam;
  }

  public disconnect() {
    this._node?.disconnect();
  }

  public destroy() {
    this._node?.port.postMessage({type: 'shutdown'});
    this._node = undefined;
    this.disconnect();
  }
}
