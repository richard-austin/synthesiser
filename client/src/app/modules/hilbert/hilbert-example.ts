
// In your setup code:
import {createHilbertFIRFilterNode} from './create-hilbert-fir-filter-node';

export async function setupHilbertExample(ctx: AudioContext, source: AudioNode) {
  // NOTE: Call only once in your app
  await ctx.audioWorklet.addModule('./hilbert-fir-processor.ts');

  const hilbertNode = await createHilbertFIRFilterNode(ctx, 101);

  // Connect: source > hilbertNode > destination
  source.connect(hilbertNode).connect(ctx.destination);
}
