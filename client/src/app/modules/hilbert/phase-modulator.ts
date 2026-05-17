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
          return [{name: 'mod', defaultValue: 0, minValue: -Math.PI*4, maxValue:Math.PI*4, automationRate: "a-rate"}];
        }
        // FIR kernel coefficients (set from parameters)
        kernel: Float32Array;
        buffer: Float32Array[];
        bufferIndex: number[] = [0, 0]
        order: number;

        running: boolean = true;

        constructor(options: any) {
          super();
          this.kernel = options.processorOptions?.kernel || new Float32Array([1]);
          this.order = this.kernel.length;
          this.buffer = Array(2);
          this.buffer[0] = Float32Array.from({length:this.order}, () => 0);
          this.buffer[1] = Float32Array.from({length:this.order}, () => 0);
           // @ts-ignore
          this.port.onmessage = (event) => {
            if (event.data.type === 'kernel') {
              this.kernel = event.data.kernel;
              this.order = this.kernel.length;
              this.buffer[0] = Float32Array.from({length:this.order}, () => 0);
              this.buffer[1] = Float32Array.from({length:this.order}, () => 0);
            } else if (event.data.type === 'shutdown') {
              this.running = false;
              // @ts-ignore
              this.port.close();
              console.log("Hilbert FIR processor closed");
            }
          };
        }

        process(inputs: Float32Array[][], outputs: Float32Array[][], parameters:any) {
          const output: Float32Array[] = outputs[0];
          const input: Float32Array[] = inputs[0];
          const modParam = parameters["mod"];
          if (!input || !output) return true;

          for (let channel = 0; channel < input.length; ++channel) {
            const outputChannel: Float32Array = output[channel];
            const inputChannel: Float32Array = input[channel];
            for (let i = 0; i < inputChannel.length; i++) {
              /* Circular buffer update */
              this.buffer[channel][this.bufferIndex[channel]] = inputChannel[i];

              /* FIR convolution */
              let y = 0;
              for (let j = 0; j < this.order; j++) {
                /* Read buffer in reverse (oldest sample first) */
                const bufferIdx = (this.bufferIndex[channel] - j + this.order) % this.order;
                y += this.buffer[channel][bufferIdx] * this.kernel[j];
              }
              const mod = modParam.length > 1 ? modParam[i] : modParam[0];
              outputChannel[i] = y * Math.sin(mod) + inputChannel[i] * Math.cos(mod);
              /* Advance buffer pointer */
              this.bufferIndex[channel] = (this.bufferIndex[channel] + 1) % this.order;
            }
          }
           return this.running;
        }
      });
    }

    await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
    const order = 71;
    // Design kernel
    const kernel = designHilbertKernel(order);

    // Create worklet node
    this.node = new AudioWorkletNode(this.audioCtx, 'hilbert-fir-processor', {
      channelCount: 1,
      channelInterpretation: 'speakers',
      processorOptions: {kernel}
    });
    this.port = this.node.port;

    /**
     * Designs an FIR Hilbert transformer kernel with the given order.
     * The kernel is real/odd-symmetric, centered, with a window (Hann).
     * The frequency response is approximately flat from ~fs/(2*order) to Nyquist.
     */
    function designHilbertKernel(order: number): Float32Array {
      if (order % 2 === 0) throw new Error('Order must be odd');
      const kernel = new Float32Array(order);
      const M = order - 1;
      const mid = M / 2;
      for (let n = 0; n < order; n++) {
        const k = n - mid;
        if (k === 0) {
          kernel[n] = 0;
        } else if (k % 2 === 0) {
          kernel[n] = 0;
        } else {
          // Hilbert impulse response: h[n] = 2/(π n) for n odd, 0 otherwise
          kernel[n] = 2 / (Math.PI * k);
          // Apply window function (Hann)
          const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / M);
          kernel[n] *= w;
        }
      }
      return kernel;
    }
  }

  modInput(): AudioParam {
    return this.node.parameters.get("mod") as AudioParam;
  }

  public disconnect() {
    this.node?.disconnect();
  }

  public destroy() {
    this.port.postMessage({type: 'shutdown'});
    this.disconnect();
    // @ts-ignore
    this.node = this.port = undefined;
  }
}
