/**
 * Factory method to create a Hilbert FIR filter node.
 * Covers the audio frequency range (e.g. 20Hz–20kHz for fs=44100Hz)
 * in Web Audio API, using the worklet defined above.
 */
export async function createHilbertFIRFilterNode(
  ctx: AudioContext,
  order = 101 // Odd order recommended for Hilbert transformers
): Promise<AudioWorkletNode> {
  // Make sure the worklet script is loaded
  if (!ctx.audioWorklet)
    throw new Error('AudioWorklet not supported in this context');

  // Typically you only need to addModule once
  // await ctx.audioWorklet.addModule('hilbert-fir-filter.worklet.js');

  // Design kernel
  const kernel = designHilbertKernel(order);

  // Create worklet node
  return new AudioWorkletNode(ctx, 'hilbert-fir-processor', {
    channelCount: 1,
    channelInterpretation: 'speakers',
    processorOptions: {kernel}
  });
}

/**
 * Designs an FIR Hilbert transformer kernel with the given order.
 * The kernel is real/odd-symmetric, centered, with a window (Hann).
 * The frequency response is approximately flat from ~fs/(2*order) to Nyquist.
 */
export function designHilbertKernel(order: number): Float32Array {
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
