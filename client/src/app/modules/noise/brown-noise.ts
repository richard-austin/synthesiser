import {GainEnvelopeBase} from '../gain-envelope-base';

export class BrownNoise extends GainEnvelopeBase{
  public static theNode: AudioWorkletNode | undefined = undefined;
  private gain:GainNode;

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
       registerProcessor('brown-noise', class Processor extends AudioWorkletProcessor {
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

         lastOut = 0;

         process(inputs: any, outputs: any, parameters: any) {
           const output = outputs[0];

           for (let channel = 0; channel < output.length; ++channel) {
             const outputChannel = output[channel];
             for (let i = 0; i < outputChannel.length; ++i) {
               let white = Math.random() * 2 - 1;
               outputChannel[i] = (this.lastOut + (0.02 * white)) / 1.02;
               this.lastOut = outputChannel[i];
               outputChannel[i] *= 3.5; // (roughly) compensate for gain
             }
           }
           return this.running;
         }
       });
     }

     if(BrownNoise.theNode === undefined) {
       await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
       BrownNoise.theNode = new AudioWorkletNode(this.audioCtx, "brown-noise");
     }
     BrownNoise.theNode.connect(this.gain);   }

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
    BrownNoise.theNode?.port.postMessage({type: 'shutdown'});
    BrownNoise.theNode?.disconnect();
    BrownNoise.theNode = undefined;
    this.disconnect();
  }

 }
