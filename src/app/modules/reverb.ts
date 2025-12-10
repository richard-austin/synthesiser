import {timer} from 'rxjs';

class Noise/* extends Voice*/ {
  private _length: number;
  context: OfflineAudioContext;
  output: GainNode;
  private _attack: number;
  private _release: number;

  constructor(context: OfflineAudioContext, gain: number) {
    this.context = context;
    this._length = 2;
    this.output = context.createGain();
    this.output.gain.value = gain;
    this._attack = 0;
    this._release = 0.001;

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
    bufferSource.connect(this.output);
  }

  start(time: number) {
    this.output.gain.value = 0;
    this.output.gain.setValueAtTime(0, time);
    this.output.gain.linearRampToValueAtTime(1, this.attack);
  }

  stop(time: number) {
    this.output.gain.setValueAtTime(1, time + this.attack);
    this.output.gain.linearRampToValueAtTime(0, this.release + this.attack + 0.2);
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
  dry!: GainNode;
  tailNoise!: Noise;

  constructor(private readonly context: AudioContext, private input: AudioNode, private output: AudioNode) {
  }

  // Advanced Reverb Setup
  setup(attackTime: number, decayTime: number, preDelay: number, repeatEchoTime: number, repeatEchoGain: number) {
    this.effect = this.context.createConvolver();

    this.reverbTime = attackTime + decayTime;

    this.attack = attackTime;
    this.decay = 0;
    this.release = decayTime + 0.03;

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
    if (this.repeatEchoGain.gain.value > .45) {
      this.repeatEchoGain.gain.value = .45;
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
  renderTail(): Noise {
    const tailContext = new OfflineAudioContext(2, this.context.sampleRate * (this.reverbTime + 1), this.context.sampleRate);
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

    timer(300).subscribe(() => {
      tailContext.startRendering().then((buffer) => {
        bufferSource.buffer = buffer;
        //       bufferSource.connect(this.context.destination);
        //       bufferSource.start();
        this.effect.buffer = buffer;
      });

      tailNoise.start(this.context.currentTime);
      tailNoise.stop(this.context.currentTime);
    });
    return tailNoise;
  }
}
