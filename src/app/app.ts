import {AfterViewInit, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {LevelControl} from './level-control/level-control';
import {Oscillator} from './modules/oscillator';
import {FreqBendValues} from './util-classes/freq-bend-values';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LevelControl],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  oscillator!: OscillatorNode;
  osc2!: OscillatorNode;
  gain!: GainNode;
  filter!: BiquadFilterNode;
  reverb!: DelayNode;
  audioCtx!: AudioContext;

  osc!: Oscillator;

  ngAfterViewInit(): void {


  }

  //protected readonly title = signal('synthesiser');

  protected setLevel(level: number) {
    this.gain.gain.setValueAtTime(level * 5, this.audioCtx.currentTime);
  }

  protected setFreq(freq: number) {
    this.osc.setFrequency(Math.pow(2, freq * 10) * 70);
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
    this.oscillator.type = "sawtooth";
    this.oscillator.frequency.setValueAtTime(1000, this.audioCtx.currentTime); // value in hertz
    this.gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.osc2 = this.audioCtx.createOscillator();
    this.osc2.type = "sine";
    this.osc2.frequency.setValueAtTime(5, this.audioCtx.currentTime);
    //osc2.connect(this.gain.gain);
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
    // this.reverb.delayTime.setValueAtTime(.02, this.audioCtx.currentTime);
    // this.reverb.connect(gain2);
    // gain2.connect(this.reverb);
    // this.reverb.connect(this.gain);
    //this.oscillator.connect(this.gain);
    this.gain.connect(this.audioCtx.destination);
    //
    this.oscillator.start();
    this.osc2.start();
    // lfo.start();


    this.filter.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
    this.filter.frequency.linearRampToValueAtTime(1000, this.audioCtx.currentTime);
    this.filter.frequency.exponentialRampToValueAtTime(1000, this.audioCtx.currentTime);
    this.oscillator.frequency.linearRampToValueAtTime(1000, this.audioCtx.currentTime);

    this.osc = new Oscillator(this.audioCtx);
    this.osc.setFrequency(1000);
    this.osc.connect(this.audioCtx.destination);
    this.osc.setModLevel(5);
    this.osc.setFreqBendEnvelope(new FreqBendValues(0, .5, .1, 0,0));
    this.osc.modulation(this.osc2);
  }

  protected play() {
    this.osc.keyDown();
  }

  protected end() {
    this.osc.keyUp();
  }
}
