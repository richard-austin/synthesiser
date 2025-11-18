export class Delay {
  public readonly delay: DelayNode;
  private readonly feedBackNode: GainNode;
  constructor(private audioCtx: AudioContext) {
    this.delay = audioCtx.createDelay();
    this.feedBackNode = this.audioCtx.createGain();
  }

  set feedbackFactor(fbf: number) {
    if(fbf > 0) {
      this.feedBackNode.gain.value = fbf;
      this.feedBackNode.connect(this.delay);
      this.delay.connect(this.feedBackNode);
    }
    else {
      this.feedBackNode.disconnect();
    }
  }

  connect(audioNode:AudioNode) {
    this.delay.connect(audioNode);
  }

  setDelay(delayTime: number) {
    this.delay.delayTime.setValueAtTime(delayTime, this.audioCtx.currentTime);
  }
}
