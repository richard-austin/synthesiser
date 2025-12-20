import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import {FilterComponent} from "../filter/filter-component";
import {OscillatorComponent} from "../oscillator/oscillator.component";
import {NoiseComponent} from '../noise/noise-component';
import {RingModulatorComponent} from '../ring-modulator/ring-modulator-component';
import {ReverbComponent} from '../reverb-component/reverb-component';
import {PhasorComponent} from '../phasor/phasor-component';
import {AnalyserComponent} from '../analyser/analyser-component';

@Component({
  selector: 'app-synth-component',
  imports: [
    FilterComponent,
    OscillatorComponent,
    NoiseComponent,
    RingModulatorComponent,
    ReverbComponent,
    PhasorComponent,
    AnalyserComponent
  ],
  templateUrl: './synth-component.html',
  styleUrl: './synth-component.scss',
})
export class SynthComponent implements AfterViewInit, OnDestroy {
  audioCtx!: AudioContext;

  @ViewChild('oscillators') oscillatorsGrp!: OscillatorComponent
  @ViewChild('oscillators2') oscillators2Grp!: OscillatorComponent
  @ViewChild(FilterComponent) filtersGrp!: FilterComponent;
  @ViewChild(NoiseComponent) noise!: NoiseComponent;
  @ViewChild(RingModulatorComponent) ringModulator!: RingModulatorComponent;
  @ViewChild(ReverbComponent) reverb!: ReverbComponent;
  @ViewChild(PhasorComponent) phasor!: PhasorComponent;
  @ViewChild(AnalyserComponent) analyser!: AnalyserComponent;
  @ViewChild('synth') synth!: ElementRef<HTMLDivElement>;

  protected async start(): Promise<void> {
    this.audioCtx = new AudioContext();

    // Start the module components
    this.oscillatorsGrp.start(this.audioCtx);
    this.oscillators2Grp.start(this.audioCtx);
    this.filtersGrp.start(this.audioCtx);

    await this.noise.start(this.audioCtx);
    this.ringModulator.start(this.audioCtx);
    this.reverb.start(this.audioCtx);
    this.phasor.setUp(this.audioCtx);
    await this.analyser.start(this.audioCtx);

    // Connect the module component outputs
    this.oscillatorsGrp.setOutputConnection();
    this.oscillators2Grp.setOutputConnection();
    this.ringModulator.setOutputConnection();
    this.noise.setOutputConnection();
    this.filtersGrp.setOutputConnection();
    this.reverb.setOutputConnection();
    this.phasor.setOutputConnection();

    window.addEventListener('click', () => {
    })
    window.addEventListener("keydown", (e) => {
      if (/^[abcdefghijklmnopqrstuvwxyz,.\/]$/.test(e.key)) {
        e.preventDefault();
        this.keydown(e);
      }
    });
    window.addEventListener("keyup", (e) => {
      if (/^[abcdefghijklmnopqrstuvwxyz,.\/]$/.test(e.key)) {
        e.preventDefault();
        this.keyup(e);
      }
    });
    navigator.requestMIDIAccess()
      .then(onMIDISuccess, onMIDIFailure);

    function onMIDISuccess(midiAccess: any) {
      console.log(midiAccess);

      for (const input of midiAccess.inputs.values())
        input.onmidimessage = getMIDIMessage;
    }

    function getMIDIMessage(midiMessage: any) {
      console.log(midiMessage);
    }

    function onMIDIFailure() {
      console.log('Could not access your MIDI devices.');
    }

  }

  downKeys: Set<number> = new Set();

  protected keydown($event: KeyboardEvent) {
    const code = this.keyCode($event);
    if (code >= 0) {
      if (!this.downKeys.has(code)) {
        this.downKeys.add(code);
        this.oscillatorsGrp.keyDown(code);
        this.oscillators2Grp.keyDown(code);
        this.filtersGrp.keyDown(code);
        this.noise.keyDown(code);
      }
    }
  }

  protected keyup($event: KeyboardEvent) {
    const code = this.keyCode($event);
    if (code >= 0) {
      if (this.downKeys.has(code))
        this.downKeys.delete(code);
      this.oscillatorsGrp.keyUp(code)
      this.oscillators2Grp.keyUp(code)
      this.filtersGrp.keyUp(code);
      this.noise.keyUp(code);
    }
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
    return code - 1;
  }

  protected setOscOutputTarget($event: string) {
    this.oscillatorsGrp.disconnect();
    switch ($event) {
      case 'speaker':
        this.oscillatorsGrp.connect(this.audioCtx.destination);
        this.oscillatorsGrp.connect(this.analyser.analyser);
        break;
      case 'ringmod':
        false
        this.oscillatorsGrp.connectToRingMod();
        break;
      case 'filter':
        this.oscillatorsGrp.connectToFilters();
        break;
      case 'reverb':
        this.oscillatorsGrp.connectToReverb();
        break;
      case 'phasor':
        this.oscillatorsGrp.connectToPhasor();
        break
      case 'off':
        break;
      default:
        console.error('Unknown oscillator output destination');
    }
  }

  protected setOsc2OutputTarget($event: string) {
    this.oscillators2Grp.disconnect();
    switch ($event) {
      case 'speaker':
        this.oscillators2Grp.connect(this.audioCtx.destination);
        this.oscillators2Grp.connect(this.analyser.analyser);
        break;
      case 'ringmod':
        this.oscillators2Grp.connectToRingMod();
        break;
      case 'filter':
        this.oscillators2Grp.connectToFilters();
        break;
      case 'reverb':
        this.oscillators2Grp.connectToReverb();
        break;
      case 'phasor':
        this.oscillators2Grp.connectToPhasor();
        break
      case 'off':
        break;
      default:
        console.error('Unknown oscillator output destination');
    }
  }

  protected setFilterOutputTarget($event: string) {
    this.filtersGrp.disconnect();
    switch ($event) {
      case 'speaker':
        this.filtersGrp.connect(this.audioCtx.destination);
        this.filtersGrp.connect(this.analyser.analyser);
        break;
      case 'ringmod':
        this.filtersGrp.connectToRingMod();
        break;
      case 'reverb':
        this.filtersGrp.connectToReverb();
        break;
      case 'phasor':
        this.filtersGrp.connectToPhasor();
        break;
      case 'off':
        break;
      default:
        console.error('Unknown filter output destination');
    }
  }

  protected setNoiseOutputTarget($event: string) {
    this.noise.disconnect();
    switch ($event) {
      case 'speaker':
        this.noise.connect(this.audioCtx.destination);
        this.noise.connect(this.analyser.analyser);
        break;
      case 'filter':
        this.noise.connectToFilters();
        break;
      case 'off':
        break;
      default:
        console.error('Unknown filter output destination');
        break;
    }
  }

  protected setRingModOutPutTarget($event: string) {
    this.ringModulator.disconnect();
    switch ($event) {
      case 'speaker':
        this.ringModulator.connect(this.audioCtx.destination);
        //   if(this.analyser.analyser)
        this.ringModulator.connect(this.analyser.analyser);
        break;
      case 'filter':
        this.ringModulator.connectToFilters();
        break;
      case 'reverb':
        this.ringModulator.connectToReverb();
        break;
      case 'off':
        break;
      default:
        console.error('Unknown ring mod output destination');
        break;
    }
  }

  protected setReverbOutputTarget($event: string) {
    this.reverb.disconnect();
    switch ($event) {
      case 'speaker':
        this.reverb.connect(this.audioCtx.destination);
        this.reverb.connect(this.analyser.analyser);
        break;
      case 'off':
        break;
    }
  }

  protected setPhasorOutputTarget($event: string) {
    this.phasor.disconnect();
    switch ($event) {
      case 'speaker':
        this.phasor.connect(this.audioCtx.destination);
        this.phasor.connect(this.analyser.analyser);
        break;
      case 'off':
        break;
    }
  }

// The wake lock sentinel.
  wakeLock: WakeLockSentinel | null = null;

// Function that attempts to request a wake lock.
  requestWakeLock = async () => {
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        console.log('Wake Lock was released');
      });
      console.log('Wake Lock is active');
    } catch (err) {
      // @ts-ignore
      console.error(`${err.name}, ${err.message}`);
    }
  };

  // Function that attempts to release the wake lock.
  releaseWakeLock = async () => {
    if (this.wakeLock) {
      return;
    }
    try {
      // @ts-ignore
      await this.wakeLock.release();
      this.wakeLock = null;
    } catch (err) {
      // @ts-ignore
      console.error(`${err.name}, ${err.message}`);
    }
  };

  scaleToFitSmallWindow() {
    const synth = this.synth.nativeElement;
    const topClearance = 35;

    let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    let vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)-topClearance;

    console.log("client width = "+vw+" client height = "+vh);
    console.log("width = "+window.innerWidth+" height = "+window.innerHeight);
    const requiredWidth = 2400;
    const requiredHeight = 1300 -topClearance;
    if (vw < requiredWidth || vh < requiredHeight) {
      synth.style.transformOrigin = `0 ${topClearance}px`;
      if(vw/requiredWidth < vh/requiredHeight)
        synth.style.transform = `scale(${vw/requiredWidth})`;
      else
        synth.style.transform = `scale(${vh/requiredHeight})`;
    } else
      synth.style.transform = `scale(1)`;
  }

  async ngAfterViewInit(): Promise<void> {
    await this.start();
    await this.requestWakeLock()
    this.scaleToFitSmallWindow();
    window.onresize = () => {
      this.scaleToFitSmallWindow();
    }
  }

  async ngOnDestroy(): Promise<void> {
    await this.releaseWakeLock();
  }
}
