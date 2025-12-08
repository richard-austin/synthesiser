
class AmpEnvelope {
  private context: OfflineAudioContext;
  output: GainNode;
  private velocity: number;
  private gain: number;
  private _attack: number;
  private _decay: number;
  private readonly _sustain: number;
  private _release: number;

  constructor(context: OfflineAudioContext, gain: number = 1) {
    this.context = context;
    this.output = this.context.createGain();
    this.output.gain.value = gain;
    this.velocity = 0;
    this.gain = gain;
    this._attack = 0;
    this._decay = 0.001;
    this._sustain = this.output.gain.value;
    this._release = 0.001;
  }

  on(velocity: number) {
    this.velocity = velocity / 127;
    this.start(this.context.currentTime);
  }

  off(MidiEvent?: any) {
    return this.stop(this.context.currentTime);
  }

  start(time: number) {
    this.output.gain.value = 0;
    this.output.gain.setValueAtTime(0, time);
    this.output.gain.setTargetAtTime(1, time, this.attack + 0.00001);
    this.output.gain.setTargetAtTime(this.sustain * this.velocity, time + this.attack, this.decay);
  }

  stop(time: number) {
    this.sustain = this.output.gain.value;
    this.output.gain.cancelScheduledValues(time);
    this.output.gain.setValueAtTime(this.sustain, time);
    this.output.gain.setTargetAtTime(0, time, this.release + 0.00001);
  }

  set attack(value) {
    this._attack = value;
  }

  get attack() {
    return this._attack
  }

  set decay(value) {
    this._decay = value;
  }

  get decay() {
    return this._decay;
  }

  set sustain(value) {
    this.gain = value;
    this._sustain;
  }

  get sustain() {
    return this.gain;
  }

  set release(value) {
    this._release = value;
  }

  get release() {
    return this._release;
  }

  connect(destination: AudioNode) {
    this.output.connect(destination);
  }
}


class Voice {
  context: OfflineAudioContext;
  value: number;
  gain: number;
  output: GainNode;
  partials: AudioBufferSourceNode[] | OscillatorNode[];
  ampEnvelope: AmpEnvelope;

  constructor(context: OfflineAudioContext, gain: number = 0.1) {
    this.context = context;
    this.value = -1;
    this.gain = gain;
    this.output = this.context.createGain();
    this.partials = [];
    this.output.gain.value = this.gain;
    this.ampEnvelope = new AmpEnvelope(this.context);
    this.ampEnvelope.connect(this.output);
  }

  off(MidiEvent?: any) {
    this.ampEnvelope.off(MidiEvent);
    this.partials.forEach((osc) => {
      osc.stop(this.context.currentTime + this.ampEnvelope.release * 4);
    });
  }

  connect(destination: AudioNode) {
    this.output.connect(destination);
  }

  set detune(value: number) {
    this.partials.forEach(p => p.detune.value = value);
  }

  set attack(value: number) {
    this.ampEnvelope.attack = value;
  }

  set decay(value: number) {
    this.ampEnvelope.decay = value;
  }

  set release(value: number) {
    this.ampEnvelope.release = value;
  }
}

class Noise extends Voice {
  private _length: number;

  constructor(context: OfflineAudioContext, gain: number) {
    super(context, gain);
    this._length = 2;
  }

  get length() {
    return this._length || 2;
  }

  set length(value) {
    this._length = value;
  }

  init() {
    let lBuffer = new Float32Array(this.length * this.context.sampleRate);
    let rBuffer = new Float32Array(this.length * this.context.sampleRate);
    for (let i = 0; i < this.length * this.context.sampleRate; i++) {
      lBuffer[i] = 1 - (2 * Math.random());
      rBuffer[i] = 1 - (2 * Math.random());
    }
    let buffer = this.context.createBuffer(2, this.length * this.context.sampleRate, this.context.sampleRate);
    buffer.copyToChannel(lBuffer, 0);
    buffer.copyToChannel(rBuffer, 1);

    let osc = this.context.createBufferSource();
    osc.buffer = buffer;
    osc.loop = true;
    osc.loopStart = 0;
    osc.loopEnd = 2;
    osc.start(this.context.currentTime);
    osc.connect(this.ampEnvelope.output);
    // @ts-ignore
    this.partials.push(osc);
  }

  on(MidiEvent: any) {
    this.value = MidiEvent.value;
    this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
  }

}


export class Reverb {
  effect!: ConvolverNode;
  reverbTime!: number;
  attack!: number
  decay!: number;
  release!: number;
  preDelay!: DelayNode;
  multitap!: DelayNode[];
  multitapGain!: GainNode;
  wet!: GainNode;

  constructor(private readonly context:AudioContext, private input:AudioNode, private output: AudioNode){
  }

  // Advanced Reverb Setup
  setup() {
    this.effect = this.context.createConvolver();

    let reverbTime = 3;  // Minimum value 1.07 ?
    let preDelay = 0.1;

    this.reverbTime = reverbTime;

    this.attack = 0;
    this.decay = 0;
    this.release = reverbTime/3;

    this.preDelay = this.context.createDelay(reverbTime);
    this.preDelay.delayTime.setValueAtTime(preDelay,    this.context.currentTime);
    this.multitap = [];
    for(let i = 2; i > 0; i--) {   // Delays repeat echo
      this.multitap.push(this.context.createDelay(reverbTime));
    }
    this.multitap.map((t,i)=>{
      if(this.multitap[i+1]) {
        t.connect(this.multitap[i+1])
      }
      t.delayTime.setValueAtTime(0.001+(i*(preDelay/2)), this.context.currentTime);
    })

    this.multitapGain = this.context.createGain();
    this.multitap[this.multitap.length-1].connect(this.multitapGain);
    this.multitapGain.gain.value = .2;

    this.multitapGain.connect(this.output);
    this.wet = this.context.createGain();

    this.input.connect(this.wet);
    this.wet.connect(this.preDelay);
    this.wet.connect(this.multitap[0]);
    this.preDelay.connect(this.effect);
    this.effect.connect(this.output);

    this.renderTail();
  }

//...AdvancedReverb Class
  renderTail () {
    const tailContext = new OfflineAudioContext(2, this.context.sampleRate * this.reverbTime, this.context.sampleRate);
    const tailOsc = new Noise(tailContext, 1);
    const tailLPFilter = tailContext.createBiquadFilter()// new Filter(tailContext, "lowpass", 5000, 1);
    tailLPFilter.type = "lowpass";
    tailLPFilter.frequency.value = 5000;
    tailLPFilter.Q.value = 1;
    const tailHPFilter = tailContext.createBiquadFilter(); // new Filter(tailContext, "highpass", 500, 1);
    tailHPFilter.type = "highpass";
    tailHPFilter.frequency.value = 500;
    tailHPFilter.Q.value = 1;

    tailOsc.init();
    tailOsc.connect(tailHPFilter);
    //tailOsc.connect(tailContext.destination);
    tailHPFilter.connect(tailLPFilter);
    tailLPFilter.connect(tailContext.destination);
    tailOsc.attack = this.attack;
    tailOsc.decay = this.decay;
    tailOsc.release = this.release;

    setTimeout(()=>{
      tailContext.startRendering().then((buffer) => {
        this.effect.buffer = buffer;
      });

    tailOsc.on({frequency: 500, velocity: 127});
    tailOsc.off();
    }, 20);
  }
}
