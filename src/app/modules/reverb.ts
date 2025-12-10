import {timer} from 'rxjs';

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
    this.output.gain.linearRampToValueAtTime(1, this.attack);
    // this.output.gain.setTargetAtTime(this.sustain * this.velocity, time + this.attack, this.decay);
  }

  stop(time: number) {
    this.output.gain.setValueAtTime(1, time+this.attack);
    this.output.gain.linearRampToValueAtTime(0, this.release+this.attack + 0.2);
  }

  set attack(value) {
    this._attack = value;
  }

  get attack() {
    return this._attack
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
  ampEnvelope: AmpEnvelope;

  constructor(context: OfflineAudioContext, gain: number = 0.1) {
    this.context = context;
    this.value = -1;
    this.gain = gain;
    this.output = this.context.createGain();
    this.output.gain.value = this.gain;
    this.ampEnvelope = new AmpEnvelope(this.context);
    this.ampEnvelope.connect(this.output);
  }

  off(MidiEvent?: any) {
    this.ampEnvelope.off(MidiEvent);
  }

  connect(destination: AudioNode) {
    this.output.connect(destination);
  }

  set attack(value: number) {
    this.ampEnvelope.attack = value;
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

    let bufferSource = this.context.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.loop = false;
    bufferSource.loopStart = 0;
    bufferSource.loopEnd = 2;
    bufferSource.start(this.context.currentTime);
    bufferSource.connect(this.ampEnvelope.output);
  }

  on(MidiEvent: any) {
    if(MidiEvent.value) {
      this.value = MidiEvent.value;
    }
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
  repeatEcho!: DelayNode;
  repeatEchoGain!: GainNode;
  wet!: GainNode;
  dry!:GainNode;
  tailNoise!: Noise;

  constructor(private readonly context:AudioContext, private input:AudioNode, private output: AudioNode){
  }

  // Advanced Reverb Setup
  setup(attackTime: number, decayTime: number, preDelay: number, repeatEchoTime: number, repeatEchoGain: number) {
    this.effect = this.context.createConvolver();

    this.reverbTime = attackTime+decayTime;

    this.attack = attackTime;
    this.decay = 0;
    this.release = decayTime+0.03;

    this.preDelay = this.context.createDelay(10);
    this.preDelay.delayTime.setValueAtTime(preDelay, this.context.currentTime);
    this.repeatEcho = this.context.createDelay(10);
    this.repeatEcho.delayTime.setValueAtTime(repeatEchoTime, this.context.currentTime);
    this.repeatEchoGain = this.context.createGain();
    // Create the repeat echo feedback loop
    this.repeatEcho.connect(this.repeatEchoGain)
    this.repeatEchoGain.connect(this.repeatEcho)
    this.repeatEchoGain.gain.value = repeatEchoGain;
    this.input.connect(this.repeatEchoGain);

    this.wet = this.context.createGain();
    this.repeatEchoGain.connect(this.wet);
    this.dry = this.context.createGain();

    this.input.connect(this.wet);
    this.input.connect(this.dry);
    this.wet.connect(this.preDelay);
    this.wet.connect(this.repeatEcho);
    this.preDelay.connect(this.effect);
    this.effect.connect(this.output);
    this.tailNoise = this.renderTail();
  }

  disconnectInput() {
    this.input.disconnect();
    if(this.repeatEchoGain.gain.value > .45) {
      this.repeatEchoGain.gain.value =.45;
    }
  }

  tearDown() {
    this.input.disconnect();
    this.wet.disconnect();
    this.dry.disconnect();
    this.preDelay.disconnect();
    this.effect.disconnect();
    this.repeatEcho.disconnect();
    this.repeatEchoGain.disconnect();
    // @ts-ignore
    this.input = this.output = null;
  }

  public setRepeatEchoTime($event: number) {
    this.repeatEcho.delayTime.value = $event;
  }

  public setRepeatEchoGain($event: number) {
    this.repeatEchoGain.gain.value = $event;
  }


//...AdvancedReverb Class
  renderTail (): Noise {
    const tailContext = new OfflineAudioContext(2, this.context.sampleRate * (this.reverbTime+1), this.context.sampleRate);
    const tailNoise = new Noise(tailContext, 1);
    tailNoise.length = this.reverbTime;
    const tailLPFilter = tailContext.createBiquadFilter()
    tailLPFilter.type = "lowpass";
    tailLPFilter.frequency.value = 5000;
    tailLPFilter.Q.value = 1;
    const tailHPFilter = tailContext.createBiquadFilter();
    tailHPFilter.type = "highpass";
    tailHPFilter.frequency.value = 500;
    tailHPFilter.Q.value = 1;

    tailNoise.init();
    tailNoise.connect(tailHPFilter);
    tailHPFilter.connect(tailLPFilter);
    tailLPFilter.connect(tailContext.destination);
    tailNoise.attack = this.attack;
    tailNoise.release = this.release;

    let bufferSource = this.context.createBufferSource();

    timer(300).subscribe(()=>{
      tailContext.startRendering().then((buffer) => {
        bufferSource.buffer = buffer;
 //       bufferSource.connect(this.context.destination);
 //       bufferSource.start();
        this.effect.buffer = buffer;
      });

      tailNoise.on({frequency: 500, velocity: 127});
      tailNoise.off();
    });
    return tailNoise;
  }
}
