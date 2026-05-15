// This file should be registered as an AudioWorkletProcessor in your WebAudio context
// @ts-ignore
class HilbertFIRProcessor extends AudioWorkletProcessor {
  // FIR kernel coefficients (set from parameters)
  kernel: Float32Array;
  buffer: Float32Array;
  bufferIndex = 0;
  order: number;
  constructor(options: any) {
    super();
    this.kernel = options.processorOptions?.kernel || new Float32Array([1]);
    this.order = this.kernel.length;
    this.buffer = new Float32Array(this.order);
    // @ts-ignore
    this.port.onmessage = (event) => {
      if (event.data.type === 'kernel') {
        this.kernel = event.data.kernel;
        this.order = this.kernel.length;
        this.buffer = new Float32Array(this.order);
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const input = inputs[0][0];
    const output = outputs[0][0];
    if (!input || !output) return true;

    for (let i = 0; i < input.length; i++) {
      /* Circular buffer update */
      this.buffer[this.bufferIndex] = input[i];

      /* FIR convolution */
      let y = 0;
      for (let j = 0; j < this.order; j++) {
        /* Read buffer in reverse (oldest sample first) */
        const bufferIdx = (this.bufferIndex - j + this.order) % this.order;
        y += this.buffer[bufferIdx] * this.kernel[j];
      }
      output[i] = y;

      /* Advance buffer pointer */
      this.bufferIndex = (this.bufferIndex + 1) % this.order;
    }

    return true;
  }
}

// @ts-ignore
registerProcessor('hilbert-fir-processor', HilbertFIRProcessor);
