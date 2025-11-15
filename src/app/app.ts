import {AfterViewInit, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {LevelControl} from './level-control/level-control';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LevelControl],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  oscillator!: OscillatorNode;
  gain!: GainNode;
  filter!: BiquadFilterNode;
  reverb!: DelayNode;
  audioCtx!: AudioContext;

  ngAfterViewInit(): void {


  }

  //protected readonly title = signal('synthesiser');

  protected setLevel(level: number) {
    this.gain.gain.setValueAtTime(level * 5, this.audioCtx.currentTime);
  }

  protected setFreq(freq: number) {
    this.oscillator.frequency.setValueAtTime((Math.pow(2, freq * 10)) * 70, this.audioCtx.currentTime);
  }

  protected setFilter(freq: number) {
    this.filter.frequency.setValueAtTime((Math.pow(2, freq * 10)) * 25, this.audioCtx.currentTime);
  }

  protected start() {
    this.audioCtx = new AudioContext();

    // create Oscillator node
    this.oscillator = this.audioCtx.createOscillator();
    this.gain = this.audioCtx.createGain();
    //const gain2 = this.audioCtx.createGain();
    // gain2.gain.setValueAtTime(.90, 0);
    this.filter = this.audioCtx.createBiquadFilter();
    // this.reverb = this.audioCtx.createDelay();
    this.oscillator.type = "sine";
    this.oscillator.frequency.setValueAtTime(0, this.audioCtx.currentTime); // value in hertz
    this.gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    //
    this.oscillator.connect(this.filter);
    //
    // const lfo = this.audioCtx.createOscillator();
    // lfo.type = "sine";
    // lfo.frequency.setValueAtTime(10, this.audioCtx.currentTime);
    // const lfoGain = this.audioCtx.createGain();
    // lfo.connect(lfoGain);
    // lfoGain.gain.setValueAtTime(1000, this.audioCtx.currentTime);
    // lfoGain.connect(this.filter.frequency);
    //
    this.filter.type = "lowpass";
    this.filter.Q.setValueAtTime(20, this.audioCtx.currentTime);
    this.filter.connect(this.gain);
    // //this.filter.connect(this.gain);
    // this.reverb.delayTime.setValueAtTime(.02, this.audioCtx.currentTime);
    // this.reverb.connect(gain2);
    // gain2.connect(this.reverb);
    // this.reverb.connect(this.gain);
    //this.oscillator.connect(this.gain);
    this.gain.connect(this.audioCtx.destination);
    //
    this.oscillator.start();
    // lfo.start();
  }


  protected play() {
    const attack = [0, 3000];
    const decaySustain = [3000, 700];
    const attackTime = 1;
    const decayTime = 1;
    if (this.filter) {
      this.filter.frequency.cancelScheduledValues(0);
      if (attackTime >= 0.01)
        this.filter.frequency.setValueCurveAtTime(attack, this.audioCtx.currentTime, attackTime);
      else
        this.filter.frequency.setValueAtTime(attack[1], this.audioCtx.currentTime);

      if (decayTime >= 0.01)
        this.filter.frequency.setValueCurveAtTime(decaySustain, this.audioCtx.currentTime + attackTime, decayTime);
      else
        this.filter.frequency.setValueAtTime(decaySustain[1], this.audioCtx.currentTime);
    }
  }

  protected end() {
    if (this.filter) {
      const release = [this.filter.frequency.value, 0];  // 1st value must be same as sustain value
      const releaseTime = 3;
      console.log(this.filter.frequency.value);
      this.filter.frequency.cancelScheduledValues(0);
      if (releaseTime >= 0.01)
        this.filter.frequency.setValueCurveAtTime(release, this.audioCtx.currentTime, releaseTime);
      else
        this.filter.frequency.setValueAtTime(0, this.audioCtx.currentTime);
    }
  }
}
