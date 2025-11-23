import {GainEnvelopeBase} from '../gain-envelope-base';

export class BrownNoise extends GainEnvelopeBase{
  private node!: AudioWorkletNode;
  constructor(audioCtx: AudioContext) {
    super(audioCtx);
  }

   async start() {
     function worklet() {
       // @ts-ignore
       registerProcessor('pink-noise', class Processor extends AudioWorkletProcessor {
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
           return true;
         }
       });
     }

     await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
     this.node = new AudioWorkletNode(this.audioCtx, "pink-noise");
     this.node.connect(this.gain);
   }

  modulation(modulator: OscillatorNode) {
    this.modulator = modulator;
    modulator.connect(this.frequencyMod);
  }
 }
