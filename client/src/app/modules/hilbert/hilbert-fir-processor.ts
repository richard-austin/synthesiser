export class HilbertFIRProcessor {
  public node!: AudioWorkletNode;
  audioCtx: AudioContext;

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
  }

  async start(): Promise<void> {
    function worklet() {
      // @ts-ignore
      registerProcessor('hilbert-fir-processor', class Processor extends AudioWorkletProcessor {
        // FIR kernel coefficients (set from parameters)
        kernel: Float32Array;
        buffer: number[][] = [];
        bufferIndex: number[] = [0,0]
        order: number;

        constructor(options: any) {
          super();
          this.kernel = options.processorOptions?.kernel || new Float32Array([1]);
          this.order = this.kernel.length;
          this.buffer[0] = [this.order];
          this.buffer[1] = [this.order];
          // @ts-ignore
          this.port.onmessage = (event) => {
            if (event.data.type === 'kernel') {
              this.kernel = event.data.kernel;
              this.order = this.kernel.length;
              this.buffer[0] = [this.order];
              this.buffer[1] = [this.order];
            }
          };
        }

        process(inputs: number[][][], outputs: number[][][]) {
          const output: number[][] = outputs[0];
          const input: number[][] = inputs[0];

          if (!input || !output) return true;

          for (let channel = 0; channel < input.length; ++channel) {
            const outputChannel: number[] = output[channel];
            const inputChannel: number[] = input[channel];
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
              outputChannel[i] = y;
              /* Advance buffer pointer */
              this.bufferIndex[channel] = (this.bufferIndex[channel] + 1) % this.order;
            }
          }
          return true;
        }
      });
    }

    await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
    const order = 101;
    // Design kernel
    const kernel = designHilbertKernel(order);

    // Create worklet node
    this.node = new AudioWorkletNode(this.audioCtx, 'hilbert-fir-processor', {
      channelCount: 1,
      channelInterpretation: 'speakers',
      processorOptions: {kernel}
    });

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
}
