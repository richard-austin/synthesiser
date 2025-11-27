import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Oscillator} from './modules/oscillator';
import {Filter} from './modules/filter';
import {ADSRValues} from './util-classes/adsrvalues';
import {Delay} from './modules/delay';
import {WhiteNoise} from './modules/noise/white-noise';
import {FreqBendValues} from './util-classes/freq-bend-values';
import {BrownNoise} from './modules/noise/brown-noise';
import {timer} from 'rxjs';
import {OscillatorComponent} from './oscillator/oscillator.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OscillatorComponent],
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
//  @ViewChild('div') div!: ElementRef<HTMLDivElement>;
    @ViewChild(OscillatorComponent) oscillatorsGrp!: OscillatorComponent
  osc!: Oscillator;
  oscx!: Oscillator;

  ngAfterViewInit(): void {
   // this.div.nativeElement.tabIndex = 0;

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
    //  this.o2[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1) + 120 * freq)+1);
      this.filters[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1) + 120 * freq));
    }
  }

  protected setFilter(freq: number) {
    //this.filter.setFrequency(Math.pow(2, freq * 10) * 70);
    // for (let i = 0; i < this.filters.length; i++) {
    //   this.filters[i].setFrequency(freq * 10000 * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
    // }
  }

  protected start(): void {
    this.audioCtx = new AudioContext();
    this.oscillatorsGrp.audioCtx = this.audioCtx;
    this.oscillatorsGrp.start();
    this.oscillatorsGrp.connect(this.audioCtx.destination);
    window.addEventListener('click', () => {})
    window.addEventListener("keydown", (e) => {
      if(/^[abcdefghijklmnopqrstuvwxyz,.\/]$/.test(e.key)) {
        e.preventDefault();
        this.keydown(e);
      }
    });
    window.addEventListener("keyup", (e) => {
      if(/^[abcdefghijklmnopqrstuvwxyz,.\/]$/.test(e.key)) {
        e.preventDefault();
        this.keyup(e);
      }
    });

  }

  protected async startx() {
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
    compressor.attack.setValueAtTime(0.3, this.audioCtx.currentTime);
    compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

    let noise = new BrownNoise(this.audioCtx);
    await noise.start();
    noise.setGain(10);

    for (let i = 0; i < 50; ++i) {
      this.oscillators.push(new Oscillator(this.audioCtx));
      this.oscillators[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
      //this.osc.connect(this.audioCtx.destination);
      this.oscillators[i].setAmplitudeEnvelope(new ADSRValues(0.03, 0.5, 1, 4))
      this.oscillators[i].useAmplitudeEnvelope = false;
      this.oscillators[i].setGain(.1);
      this.oscillators[i].setFreqBendEnvelope(new FreqBendValues(3, 1.5, .2, 1.5,0.2, 0.0));
      this.oscillators[i].useFreqBendEnvelope(false);
      this.oscillators[i].setType('square');
//      this.oscillators[i].modulation(lfo, modulationType.frequency);
 //     this.oscillators[i].modulationOff();
  //    this.oscillators[i].setModLevel(23.4);

      // this.o2.push(new Oscillator(this.audioCtx));
      // this.o2[i].setFrequency(20 * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
      // //this.osc.connect(this.audioCtx.destination);
      // this.o2[i].setModLevel(0);
      // this.o2[i].setAmplitudeEnvelope(new ADSRValues(0.03, 0.5, 1, 4))
      // this.o2[i].useAmplitudeEnvelope = false;
      // this.o2[i].setGain(0.03);
      // this.o2[i].setFreqBendEnvelope(new FreqBendValues(.2, 1.5, .2, 1.5,1.5, 0.5));
      // this.o2[i].freqBendEnvelopeOff();
      // this.o2[i].setType('square');
      // this.o2[i].modulation(lfo, modulationType.amplitude);
      // //  this.o2[i].modulationOff();
      // this.o2[i].setModLevel(2);


      this.filters.push(new Filter(this.audioCtx));
      this.filters[i].setFrequency(2.5 * Math.pow(Math.pow(2, 1 / 12), (i + 1)));
      this.filters[i].setQ(15);
      this.filters[i].setType('lowpass');
      this.filters[i].modulation(lfo);
      this.filters[i].setModLevel(2);
      //this.filters[i].modulationOff();
      this.filters[i].setAmplitudeEnvelope(new ADSRValues(0.0, 0.4, 1, 1));
      this.filters[i].useAmplitudeEnvelope = true;
      this.filters[i].setGain(0.2);
      this.filters[i].setFreqBendEnvelope(new FreqBendValues(0, 1, 1, 1, 4, 0));
  //    this.filters[i].freqBendEnvelopeOff();
      this.oscillators[i].connect(this.filters[i].filter);
    //  this.o2[i].connect(this.filters[i].filter);
      compressor.connect(this.audioCtx.destination);
      //this.filters[i].connect(this.delay.delay);
  //    this.filters[i].connect(compressor);

      let iter = () => {
        const sub1 = timer(3000).subscribe(() => {
          for(let i = 0; i < this.oscillators.length; ++i) {
            this.oscillators[i].setModLevel(0);
          }
          sub1.unsubscribe()
          const sub2 = timer(3000).subscribe(() => {
            for(let i = 0; i < this.oscillators.length; ++i) {
              this.oscillators[i].setModLevel(16);
            }
            sub2.unsubscribe();
            iter();
          })
        });
      }
      //iter();

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
    //       iter();q
    //       sub2.unsubscribe();
    //     });
    //     sub.unsubscribe();
    //   });
    // }
    // iter();

  }

  noises: WhiteNoise[] = [];
  oscillators: Oscillator[] = []
 // o2: Oscillator[] = [];
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
    if (code >= 0) {
      if (!this.downKeys.has(code)) {
        this.downKeys.add(code);
        this.oscillatorsGrp.keyDown(code)
        //this.o2[code].keyDown()
    //    this.filters[code].keyDown();
        // this.noises[code].attack();
     }
    }
  }

  protected keyup($event: KeyboardEvent) {
    const code = this.keyCode($event);
    if (code >= 0) {
      if (this.downKeys.has(code))
        this.downKeys.delete(code);
      this.oscillatorsGrp.keyUp(code)
   //   this.o2[code].keyUp()
     // this.filters[code].keyUp();
    }
  //  this.noises[code].release();
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
    return code-1;
  }

  protected setOscOutputTarget($event:string) {
    this.oscillatorsGrp.disconnect();
    switch ($event) {
      case 'speaker':
        this.oscillatorsGrp.connect(this.audioCtx.destination);
        break;
      case 'filter':
        break;
      case 'ringmod':
        break;
      case 'off':
        break;
    }
  }
}
