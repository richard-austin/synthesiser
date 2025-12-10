import {timer} from 'rxjs';

class Noise/* extends Voice*/ {
  private _length: number;
  context: OfflineAudioContext;
  output: GainNode;
  private _attack: number;
  private _decay: number;

  constructor(context: OfflineAudioContext, gain: number) {
    this.context = context;
    this._length = 2;
    this.output = context.createGain();
    this.output.gain.value = gain;
    this._attack = 0;
    this._decay = 0.001;

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
    this.output.gain.linearRampToValueAtTime(0, this.decay + this.attack + 0.2);
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

  connect(destination: AudioNode) {
    this.output.connect(destination);
  }
}


export class Reverb {
  private effect!: ConvolverNode;
  private attack!: number
  private decay!: number;
  private preDelay!: DelayNode;
  private repeatEcho!: DelayNode;
  private repeatEchoGain!: GainNode;
  private wet!: GainNode;
  private dry!: GainNode;

  constructor(private readonly context: AudioContext, private input: AudioNode, private wetOutput: AudioNode, private dryOutput : AudioNode) {
  }

  // Advanced Reverb Setup
  setup(attackTime: number, decayTime: number, preDelay: number, repeatEchoTime: number, repeatEchoGain: number) {
    this.effect = this.context.createConvolver();

    this.attack = attackTime;
    this.decay = decayTime + 0.03;

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

    this.input.connect(this.dry);
    this.input.connect(this.preDelay);
    this.input.connect(this.repeatEcho);
    this.preDelay.connect(this.effect);
    this.effect.connect(this.wet);
    this.wet.connect(this.wetOutput);
    this.dry.connect(this.dryOutput);
    this.renderTail();
  }

  public setRepeatEchoTime($event: number) {
    this.repeatEcho.delayTime.value = $event;
  }

  public setRepeatEchoGain($event: number) {
    this.repeatEchoGain.gain.value = $event;
  }

  public setAttack(attack: number) {
    this.attack = attack;
  }

  public setDecay(decay: number) {
    this.decay = decay;
  }
  public setPreDelay(delay: number) {
    this.preDelay.delayTime.value = delay;
  }

  public setWetGain(gain: number) {
    this.wet.gain.value = gain;
  }

  public setDryGain(gain: number) {
    this.dry.gain.value = gain;
  }

  public renderTail(): Noise {
    const tailContext = new OfflineAudioContext(2, this.context.sampleRate * ((this.attack + this.decay) + 1), this.context.sampleRate);
    const tailNoise = new Noise(tailContext, 1);
    tailNoise.length = this.attack + this.decay;
    const tailLPFilter = tailContext.createBiquadFilter()
    tailLPFilter.type = "lowpass";
    tailLPFilter.frequency.value = 5000;
    tailLPFilter.Q.value = 1;
    const tailHPFilter = tailContext.createBiquadFilter();
    tailHPFilter.type = "highpass";
    tailHPFilter.frequency.value = 50;
    tailHPFilter.Q.value = 1;

    tailNoise.init();
    tailNoise.connect(tailHPFilter);
    tailHPFilter.connect(tailLPFilter);
    tailLPFilter.connect(tailContext.destination);
    tailNoise.attack = this.attack;
    tailNoise.decay = this.decay;

    let bufferSource = this.context.createBufferSource();

    timer(300).subscribe(() => {
      tailContext.startRendering().then((buffer) => {
        // This stuff commented out is for listening to the impulse from the Noise source
        //bufferSource.buffer = buffer;
        // bufferSource.connect(this.context.destination);
        // bufferSource.start();
        this.effect.buffer = buffer;
      });

      tailNoise.start(this.context.currentTime);
      tailNoise.stop(this.context.currentTime);
    });
    return tailNoise;
  }
}
