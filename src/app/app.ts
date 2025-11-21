import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {LevelControl} from './level-control/level-control';
import {Oscillator} from './modules/oscillator';
import {Filter} from './modules/filter';
import {ADSRValues} from './util-classes/adsrvalues';
import {Delay} from './modules/delay';
import {WhiteNoise} from './modules/noise/white-noise';
import {GainEnvelopeBase} from './modules/gain-envelope-base';

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
  @ViewChild('div') div!: ElementRef<HTMLDivElement>;

  osc!: Oscillator;
  oscx!: Oscillator;

  ngAfterViewInit(): void {
    this.div.nativeElement.tabIndex = 0;

  }

  //protected readonly title = signal('synthesiser');
  delay!: Delay;

  protected setLevel(level: number) {
    if (this.delay)
      this.delay.setDelay(level / 10);
    // this.gain.gain.setValueAtTime(level * 5, this.audioCtx.currentTime);
  }

  protected setFreq(freq: number) {
    //this.osc.setFrequency(Math.pow(2, freq * 10) * 70);
    // this.oscx.setFrequency(Math.pow(2, freq *10 + 0.8) * 70);
    // this.filter.setFrequency(Math.pow(2, freq * 10) * 70);
    for (let i = 0; i < this.oscillators.length; i++) {
      this.oscillators[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1) + 120 * freq));
      this.filters[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1) + 120 * freq));
    }
  }

  protected setFilter(freq: number) {
    //this.filter.setFrequency(Math.pow(2, freq * 10) * 70);
    // for (let i = 0; i < this.filters.length; i++) {
    //   this.filters[i].setFrequency(freq * 10000 * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
    // }
  }

  protected async start() {
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
    this.gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
    this.osc2 = this.audioCtx.createOscillator();
    this.osc2.type = "sine";
    this.osc2.frequency.setValueAtTime(5, this.audioCtx.currentTime);
    //osc2.connect(this.gain.gain);
    //
    // this.oscillator.connect(this.filter);
    //
    const lfo = this.audioCtx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(6, this.audioCtx.currentTime);
    const lfoGain = this.audioCtx.createGain();
    lfo.connect(lfoGain);
    lfoGain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    // this.reverb.delayTime.setValueAtTime(.02, this.audioCtx.currentTime);
    // this.reverb.connect(gain2);
    // gain2.connect(this.reverb);
    // this.reverb.connect(this.gain);
    //this.oscillator.connect(this.gain);
    //this.gain.connect(this.audioCtx.destination);
    //
    //this.oscillator.start();
    //this.osc2.start();
    lfo.start();


    // this.filter.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
    // this.filter.frequency.linearRampToValueAtTime(1000, this.audioCtx.currentTime);
    // this.filter.frequency.exponentialRampToValueAtTime(1000, this.audioCtx.currentTime);
    // this.oscillator.frequency.linearRampToValueAtTime(1000, this.audioCtx.currentTime);

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
    this.delay = new Delay(this.audioCtx);
    const compressor = this.audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, this.audioCtx.currentTime);
    compressor.knee.setValueAtTime(40, this.audioCtx.currentTime);
    compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
    compressor.attack.setValueAtTime(0, this.audioCtx.currentTime);
    compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);
    compressor.connect(this.audioCtx.destination);
    for (let i = 0; i < 40; ++i) {
      this.oscillators.push(new Oscillator(this.audioCtx));
      this.oscillators[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
      //this.osc.connect(this.audioCtx.destination);
      this.oscillators[i].setModLevel(2);
      this.oscillators[i].setAmplitudeEnvelope(new ADSRValues(0, 0.5, GainEnvelopeBase.minLevel, 1))
      this.oscillators[i].useAmplitudeEnvelope = true;
      //this.oscillators[i].setFreqBendEnvelope(new FreqBendValues(0, .5, .1, 0,0));
      this.oscillators[i].setType('square');
    //  this.oscillators[i].modulation(lfo);
      this.filters.push(new Filter(this.audioCtx));
      this.filters[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
      this.filters[i].setQ(3);
      this.filters[i].setType('lowpass');
     // this.filters[i].modulation(lfo);
     // this.filters[i].setModLevel(2);
      this.filters[i].setAmplitudeEnvelope(new ADSRValues(0, 0.4, 1, 1));
      this.filters[i].useAmplitudeEnvelope = true;
     //this.filters[i].setFreqBendEnvelope(new FreqBendValues(0.3, 1, 0.08, .5, 0.8, 0.0));
     // this.filters[i].freqBendEnvelopeOff();
      this.oscillators[i].connect(this.filters[i].filter);
      //this.filters[i].connect(this.delay.delay);
      this.filters[i].connect(compressor);

      // this.noises[i] = new WhiteNoise(this.audioCtx); // new WhiteNoise(this.audioCtx);
      // await this.noises[i].start();
      // this.noises[i].modulationOff()
      // this.noises[i].setAmplitudeEnvelope(new ADSRValues(0, 0, 1, 5));
      // this.noises[i].useAmplitudeEnvelope = true;
      // this.noises[i].connect(this.filters[i].filter);

      // this.noises[i].connect(this.filters[i].filter);
      //this.filters[i].connect(this.delay.delay);
    }
    // let noise = new WhiteNoise(this.audioCtx); // new WhiteNoise(this.audioCtx);
    // await noise.start();
    //
    // noise.connect(this.filters[0].filter);
    // this.filters[0].connect(this.audioCtx.destination);
    //noise.start();
    //  this.oscillators[0].connect(this.delay.delay);
    //this.delay.connect(this.audioCtx.destination);
    // this.gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
    // this.gain.connect(this.delay.delay);
    // this.delay.setDelay(0);
    // this.delay.feedbackFactor = 0.8;
    // this.delay.connect(this.audioCtx.destination);
    // let index = 0;
    // let iter: ()=> void = () => {
    //   const sub = timer(200).subscribe(() => {
    //     //this.oscillators[index].keyDown();
    //     this.filters[index].keyDown();
    //
    //     const sub2 = timer(200).subscribe(() => {
    //       //this.oscillators[index].keyUp();
    //       this.filters[index++].keyUp();
    //       if(index >= this.oscillators.length) {
    //         index = 0;
    //       }
    //       iter();
    //       sub2.unsubscribe();
    //     });
    //     sub.unsubscribe();
    //   });
    // }
    // iter();
  }

  noises: WhiteNoise[] = [];
  oscillators: Oscillator[] = []
  filters: Filter[] = [];
  mods: Oscillator[] = [];

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

  downKeys: Set<number> = new Set();

  protected keydown($event: KeyboardEvent) {
    const code = this.keyCode($event);
    if (code !== 0) {
      if (!this.downKeys.has(code)) {
        this.downKeys.add(code);
        this.oscillators[code].keyDown()
        this.filters[code].keyDown();
        // this.noises[code].attack();
      }
    }
  }

  protected keyup($event: KeyboardEvent) {
    const code = this.keyCode($event);
    if (code !== 0) {
      if (this.downKeys.has(code))
        this.downKeys.delete(code);
      this.oscillators[code].keyUp()
      this.filters[code].keyUp();
    }
    // this.noises[code].release();
  }

  keyCode(e: KeyboardEvent) {
    let code = 0;
    switch (e.key) {
      case 'q':
        code = 1;
        break;
      case 'w':
        code = 2;
        break;
      case 'e':
        code = 3;
        break;
      case 'r':
        code = 4;
        break;
      case 't':
        code = 5;
        break;
      case 'y':
        code = 6;
        break;
      case 'u':
        code = 7;
        break;
      case 'i':
        code = 8;
        break;
      case 'o':
        code = 9;
        break;
      case 'p':
        code = 10;
        break;
      case 'a':
        code = 11;
        break;
      case 's':
        code = 12;
        break;
      case 'd':
        code = 13;
        break;
      case 'f':
        code = 14;
        break;
      case 'g':
        code = 15;
        break;
      case 'h':
        code = 16;
        break;
      case 'j':
        code = 17;
        break;
      case 'k':
        code = 18;
        break;
      case 'l':
        code = 19;
        break;
      case 'z':
        code = 20;
        break;
      case 'x':
        code = 21;
        break;
      case 'c':
        code = 22;
        break;
      case 'v':
        code = 23;
        break;
      case 'b':
        code = 24;
        break;
      case 'n':
        code = 25;
        break;
      case 'm':
        code = 26;
        break;
      case ',':
        code = 27;
        break;
      case '.':
        code = 28;
        break;
      case '/':
        code = 29;
        break;
    }
    e.preventDefault();
    return code;
  }
}
