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
          return [{name: 'bandwidth', defaultValue: 0, minValue: -0.999, maxValue:0.999, automationRate: "k-rate"}, {name: 'frequency', defaultValue: 0, minValue: -1, maxValue:0.999, automationRate: "k-rate"}];
        }

        bandwidth: number = 0;
        frequency: number = 0;
        lastFrequency: number = -2;
        zMiOne: number[] = [0,0];
        zMiTwo: number[] = [0,0];

        running: boolean = true;

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

        process(inputs: number[][][], outputs: number[][][], parameters: any) {
          this.bandwidth = parameters["bandwidth"][0];
          const fx = parameters["frequency"][0];
          if(fx !== this.lastFrequency) {
            this.lastFrequency = fx;
            this.frequency =0.850918128 * Math.exp(fx) -1.313035285;
          }

          const output: number[][] = outputs[0];
          const input: number[][] = inputs[0];

          let sum1: number;
          let sum2: number;
          let sum3: number;
          let sum4: number;

          for (let channel = 0; channel < input.length; ++channel) {
            const outputChannel: number[] = output[channel];
            const inputChannel: number[] = input[channel];
            for (let i = 0; i < outputChannel.length; ++i) {
              sum2 = this.zMiOne[channel] * -this.frequency*(1 - this.bandwidth);
              sum2 += this.zMiTwo[channel] * this.bandwidth;
              sum1 = inputChannel[i];
              sum1 += sum2;

              sum4 = this.zMiTwo[channel];
              sum4 += this.zMiOne[channel] * this.frequency*(1 - this.bandwidth);
              sum3 = sum1 * -this.bandwidth;
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
  public bandwidth(c: number) {
     this._node?.parameters.get("bandwidth")?.setValueAtTime(c, 0);
  }

  // Phase / frequency
  public frequency(d: number) {
    this._node?.parameters.get("frequency")?.setValueAtTime(d, 0);
  }
  public mod(): AudioParam {
    return this._node?.parameters.get("frequency") as AudioParam;
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
