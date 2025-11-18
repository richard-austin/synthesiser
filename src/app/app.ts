import {AfterViewInit, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {LevelControl} from './level-control/level-control';
import {Oscillator} from './modules/oscillator';
import {Filter} from './modules/filter';
import {FreqBendValues} from './util-classes/freq-bend-values';
import {timer} from 'rxjs';
import {ADSRValues} from './util-classes/adsrvalues';

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
  filter!: Filter;
  reverb!: DelayNode;
  audioCtx!: AudioContext;

  osc!: Oscillator;
  oscx!:Oscillator;

  ngAfterViewInit(): void {


  }

  //protected readonly title = signal('synthesiser');

  protected setLevel(level: number) {
    this.gain.gain.setValueAtTime(level * 5, this.audioCtx.currentTime);
  }

  protected setFreq(freq: number) {
    this.osc.setFrequency(Math.pow(2, freq * 10) * 70);
    this.oscx.setFrequency(Math.pow(2, freq *10 + 0.8) * 70);
    this.filter.setFrequency(Math.pow(2, freq * 10) * 70);
  }

  protected setFilter(freq: number) {
    this.filter.setFrequency(Math.pow(2, freq * 10) * 70);
  }

  protected start() {
    this.audioCtx = new AudioContext();

    // create Oscillator node
    this.oscillator = this.audioCtx.createOscillator();
    this.gain = this.audioCtx.createGain();
    //const gain2 = this.audioCtx.createGain();
    // gain2.gain.setValueAtTime(.90, 0);
   // this.filter = this.audioCtx.createBiquadFilter();
    // this.reverb = this.audioCtx.createDelay();
    this.oscillator.type = "sawtooth";
    this.oscillator.frequency.setValueAtTime(1000, this.audioCtx.currentTime); // value in hertz
    this.gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.osc2 = this.audioCtx.createOscillator();
    this.osc2.type = "sine";
    this.osc2.frequency.setValueAtTime(5, this.audioCtx.currentTime);
    //osc2.connect(this.gain.gain);
    //
   // this.oscillator.connect(this.filter);
    //
    // const lfo = this.audioCtx.createOscillator();
    // lfo.type = "sine";
    // lfo.frequency.setValueAtTime(10, this.audioCtx.currentTime);
    // const lfoGain = this.audioCtx.createGain();
    // lfo.connect(lfoGain);
    // lfoGain.gain.setValueAtTime(1000, this.audioCtx.currentTime);
    // lfoGain.connect(this.filter.frequency);
    //
    //this.filter.type = "lowpass";
   // this.filter.Q.setValueAtTime(20, this.audioCtx.currentTime);
    //this.filter.connect(this.gain);
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


    // this.filter.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
    // this.filter.frequency.linearRampToValueAtTime(1000, this.audioCtx.currentTime);
    // this.filter.frequency.exponentialRampToValueAtTime(1000, this.audioCtx.currentTime);
    // this.oscillator.frequency.linearRampToValueAtTime(1000, this.audioCtx.currentTime);

 //    this.oscx = new Oscillator(this.audioCtx);
 //    this.oscx.setFrequency(200);
 //    //this.osc.connect(this.audioCtx.destination);
 //    this.oscx.setModLevel(5);
 //    //  this.osc.setFreqBendEnvelope(new FreqBendValues(0, .5, .1, 0,0));
 //    this.oscx.setType('square');
 //    //   this.osc.modulation(this.osc2);
 //    this.osc = new Oscillator(this.audioCtx);
 //    this.osc.setFrequency(200);
 //    //this.osc.connect(this.audioCtx.destination);
 //    this.osc.setModLevel(5);
 //  //  this.osc.setFreqBendEnvelope(new FreqBendValues(0, .5, .1, 0,0));
 //    this.osc.setType('square');
 // //   this.osc.modulation(this.osc2);
 //
 //    this.filter = new Filter(this.audioCtx)
 //    this.filter.setFrequency(1000);
 //    this.filter.setQ(10);
 //    this.oscx.connect(this.filter.filter);
 //    this.osc.connect(this.filter.filter);
 //
 //    this.filter.connect(this.audioCtx.destination);
 //    this.filter.setModLevel(40);
 //    this.filter.setFreqBendEnvelope(new FreqBendValues(0.1, 1, .5, 0,0.5));
 //    this.filter.modulation(this.osc2);
    console.log(Math.pow(2, 1/12));
    for(let i=0; i < 60; ++i) {
      this.oscillators.push(new Oscillator(this.audioCtx));
         this.oscillators[i].setFrequency(200 * Math.pow(Math.pow(2, 1/12), (i+1)));
         //this.osc.connect(this.audioCtx.destination);
         this.oscillators[i].setModLevel(5);
         this.oscillators[i].setAmplitudeEnvelope(new ADSRValues(0.1, 0.1, 0.8, 1))
         this.oscillators[i].useAmplitudeEnvelope = false;
         //this.oscillators[i].setFreqBendEnvelope(new FreqBendValues(0, .5, .1, 0,0));
         this.oscillators[i].setType('sawtooth');
        this.filters.push(new Filter(this.audioCtx));
        this.filters[i].setFrequency(200 * Math.pow(Math.pow(2, 1/12), (i+1)));
        this.filters[i].setQ(15);
        this.filters[i].setType('lowpass');
        //this.filters[i].setModLevel(40);
        this.filters[i].setFreqBendEnvelope(new FreqBendValues(0.1, 20, 0.08, 3,0.8, 0.1));
       // this.filters[i].freqBendEnvelopeOff();
        this.oscillators[i].connect(this.filters[i].filter);
        this.filters[i].connect(this.audioCtx.destination);
    }
    let index = 0;
    let iter: ()=> void = () => {
      const sub = timer(200).subscribe(() => {
        this.oscillators[index].keyDown();
        this.filters[index].keyDown();

        const sub2 = timer(200).subscribe(() => {
          this.oscillators[index].keyUp();
          this.filters[index++].keyUp();
          if(index >= this.oscillators.length) {
            index = 0;
          }
          iter();
          sub2.unsubscribe();
        });
        sub.unsubscribe();
      });
    }
    iter();
  }
  oscillators:Oscillator[] = []
  filters:Filter[] = [];
  mods:Oscillator[] = [];

  protected play() {
    // this.osc.keyDown();
    // this.oscx.keyDown();
    // this.filter.keyDown();
  }

  protected end() {
    // this.osc.keyUp();
    // this.oscx.keyUp();
    // this.filter.keyUp();
  }
}
