interface IDictionary {
  [index: string]: Float32Array;
}

export class PhaseModulator {
  public node!: AudioWorkletNode;
  public port!: MessagePort;
  audioCtx: AudioContext;

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
  }

  async start(): Promise<void> {
    function worklet() {
      // @ts-ignore
      registerProcessor('hilbert-fir-processor', class Processor extends AudioWorkletProcessor {
        static get parameterDescriptors() {
          return [{
            name: 'mod',
            defaultValue: 0,
            minValue: -Math.PI * 4,
            maxValue: Math.PI * 4,
            automationRate: "a-rate"
          },
            {
              name: 'frequency',
              defaultValue: 10,
              minValue: 0,
              maxValue: 25000,
              automationRate: "a-rate"
            },
          ];
        }

        // FIR kernel coefficients (set from parameters)
        inputIndex: number[] = [0, 0]
        outputIndex: number[] = [0, 0]
        running: boolean = true;
        readonly buffer: Float32Array[];
        readonly bufferSize: number;
        readonly sampleRate: number;
        readonly minFrequency = 10;

        constructor(options: any) {
          super();
          this.sampleRate = options?.sampleRate || 48000;
          this.bufferSize = this.sampleRate / this.minFrequency / 4;  // 1 quadrant of time
          this.buffer = [];
          this.buffer[0] = new Float32Array(this.bufferSize);
          this.buffer[1] = new Float32Array(this.bufferSize);
          // @ts-ignore
          this.port.onmessage = (event) => {
            if (event.data.type === 'shutdown') {
              this.running = false;
              // @ts-ignore
              this.port.close();
              console.log("Phase modulator closed");
            }
          }
        }

        lastFrequencyParam: number[] = [-1, -1];
        process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: IDictionary) {
          const output: Float32Array[] = outputs[0];
          const input: Float32Array[] = inputs[0];
          const modParam = parameters["mod"];
          const frequencyParam = parameters["frequency"];

          if (!input || !output) return true;

          for (let channel = 0; channel < input.length; ++channel) {

            const outputChannel: Float32Array = output[channel];
            const inputChannel: Float32Array = input[channel];
            for (let i = 0; i < inputChannel.length; i++) {
              // const freq = frequencyParam.length > 1 ? frequencyParam[i] : frequencyParam[0];
              // if (freq !== this.lastFrequencyParam[channel]) {
              //   this.lastFrequencyParam[channel] = freq;
              //   console.log(freq);
              //   this.outputIndex[channel] = Math.abs((this.inputIndex[channel] - this.sampleRate / freq / 4) % this.bufferSize); // 1 quadrant
              // }
              // /* Circular buffer update */
              // this.buffer[channel][this.inputIndex[channel]] = inputChannel[i];
              //
              // // Output processed audio
              //const y = this.buffer[channel][this.outputIndex[channel]];
              const mod = modParam.length > 1 ? modParam[i] : modParam[0];
              outputChannel[i] = /*y; // * Math.sin(mod) + */inputChannel[i] * Math.cos(mod);
              // Increment input and output circular buffer indexes
              // this.outputIndex[channel] = (this.outputIndex[channel] + 1) % this.bufferSize;
              // this.inputIndex[channel] = (this.inputIndex[channel] + 1) % this.bufferSize;

            }
          }
          return this.running;
        }
      });
    }

    await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
    // Create worklet node
    this.node = new AudioWorkletNode(this.audioCtx, 'hilbert-fir-processor', {
      channelCount: 2,
      channelInterpretation: 'speakers',
      processorOptions: {sampleRate: this.audioCtx.sampleRate}
    });
    this.port = this.node.port;
  }

  get modInput(): AudioParam {
    return this.node.parameters.get("mod") as AudioParam;
  }

  get frequency(): AudioParam {
    return this.node?.parameters.get("frequency") as AudioParam;
  }

  public disconnect() {
    this.node?.disconnect();
  }

  public connect(node: AudioNode) {
    this.node.connect(node)
  }

  public destroy() {
    this.port.postMessage({type: 'shutdown'});
    this.disconnect();
    // @ts-ignore
    this.node = this.port = undefined;
  }
}
