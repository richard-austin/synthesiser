import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import {FilterComponent} from "../filter/filter-component";
import {OscillatorComponent} from "../oscillator/oscillator.component";
import {NoiseComponent} from '../noise/noise-component';
import {RingModulatorComponent} from '../ring-modulator/ring-modulator-component';
import {ReverbComponent} from '../reverb-component/reverb-component';
import {PhasorComponent} from '../phasor/phasor-component';
import {AnalyserComponent} from '../analyser/analyser-component';
import {GeneralComponent} from '../general/general.component';
import {ActivatedRoute, Router} from '@angular/router';
import {SynthSettings} from '../settings/synth-settings';
import {RestfulApiService} from '../services/restful-api.service';

@Component({
  selector: 'app-synth-component',
  imports: [
    FilterComponent,
    OscillatorComponent,
    NoiseComponent,
    RingModulatorComponent,
    ReverbComponent,
    PhasorComponent,
    AnalyserComponent,
    GeneralComponent
  ],
  templateUrl: `./synth-component.html`,
  styleUrl: './synth-component.scss',
})
export class SynthComponent implements AfterViewInit, OnDestroy {
  audioCtx!: AudioContext;
  protected numberOfOscillators: 1 | 0x7f = 1;
  midiInputs: MIDIInput[] = [];
  settings: SynthSettings | null = null;
  configFileName: string | null = null;
  keydownHandler = (e: KeyboardEvent) => {
    const target = e.target as HTMLInputElement;
    if (target.id === 'configFile') {
      return;  // Allow input of config file name etc. to input element
    }
    if (/^[abcdefghijklmnopqrstuvwxyz,.\/]$/.test(e.key)) {
      e.preventDefault();
      this.computerKeydown(e);
    }
  }

  keyupHandler = (e: KeyboardEvent) => {
    if (/^[abcdefghijklmnopqrstuvwxyz,.\/]$/.test(e.key)) {
      e.preventDefault();
      this.computerKeyUp(e);
    }
  }

  @ViewChild('oscillators') oscillatorsGrp!: OscillatorComponent
  @ViewChild('oscillators2') oscillators2Grp!: OscillatorComponent
  @ViewChild(FilterComponent) filtersGrp!: FilterComponent;
  @ViewChild(NoiseComponent) noise!: NoiseComponent;
  @ViewChild(RingModulatorComponent) ringModulator!: RingModulatorComponent;
  @ViewChild(ReverbComponent) reverb!: ReverbComponent;
  @ViewChild(PhasorComponent) phasor!: PhasorComponent;
  @ViewChild(AnalyserComponent) analyser!: AnalyserComponent;
  @ViewChild('synth') synth!: ElementRef<HTMLDivElement>;
  @ViewChild('general') masterVolume!: GeneralComponent;

  constructor(private route: ActivatedRoute, private router: Router, private rest: RestfulApiService) {
    const type = this.route.snapshot.paramMap.get('type');
    this.numberOfOscillators = type === 'poly' ? 0x7f : 1;
    const fileName = this.route.snapshot.params['fileName'];
    if (fileName) {
      this.configFileName = fileName;
    } else {
      this.configFileName = this.settings = null;
    }
  }

  protected async start(settings: SynthSettings | null): Promise<void> {
    this.audioCtx = new AudioContext();

    // Start the module components
    this.oscillatorsGrp.start(this.audioCtx, settings ? settings.oscillator1Settings : settings);
    this.oscillators2Grp.start(this.audioCtx, settings ? settings.oscillator2Settings : settings);
    this.filtersGrp.start(this.audioCtx, settings ? settings.filterSettings : settings);

    await this.noise.start(this.audioCtx, settings ? settings.noiseSettings : settings);
    this.ringModulator.start(this.audioCtx, settings ? settings.ringModSettings : settings);
    this.reverb.start(this.audioCtx, settings ? settings.reverbSettings : settings);
    this.phasor.setUp(this.audioCtx, settings ? settings.phasorSettings : settings);
    await this.analyser.start(this.audioCtx, settings ? settings.analyserSettings : settings);
    this.masterVolume.start(this.audioCtx, settings ? settings.generalSettings : settings);
    this.masterVolume.connect(this.analyser.node())

    // Connect the module component outputs
    this.oscillatorsGrp.setOutputConnection();
    this.oscillators2Grp.setOutputConnection();
    this.ringModulator.setOutputConnection();
    this.noise.setOutputConnection();
    this.filtersGrp.setOutputConnection();
    this.reverb.setOutputConnection();
    this.phasor.setOutputConnection();

    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("keyup", this.keyupHandler);

    navigator.requestMIDIAccess()
      .then(onMIDISuccess, onMIDIFailure);

    function onMIDISuccess(midiAccess: any) {
      console.log(midiAccess);

      listInputsAndOutput(midiAccess);
      startLoggingMIDIInput(midiAccess);
    }

    const onMIDIMessage = (event: any) => {
      let str = `MIDI message received at timestamp ${event.timeStamp}[${event.data.length} bytes]: `;
      for (const character of event.data) {
        str += `0x${character.toString(16)} `;
      }
      if (event.data[0] !== 0xfe) {
        //console.log(str);
        switch (event.data[0]) {
          case 0x90:
            //  console.log("midi key = " + event.data[1]);
            if (event.data[2] === 0)
              this.keyup(event.data[1]);  // Zero velocity on keydown event === keyup
            else
              this.keydown(event.data[1], event.data[2]);
            break;
          case 0x80:
            //  console.log("midi key = " + event.data[0]+" (keyup)");
            this.keyup(event.data[1]);
            break;
          case 0xe0:
            //  console.log("pitch bend "+event.data[2]);
            this.pitchBend(event.data[2]);
            break;
          case 0xb0:
            if (event.data[1] === 0x01) {
              //    console.log("mod level "+event.data[2]);
              this.modLevel(event.data[2]);
              break
            } else if (event.data[1] === 0x07) {
              //      console.log("volume level "+event.data[2]);
              this.setMasterVolume(event.data[2]);
            }
        }
      }
    }


    const startLoggingMIDIInput = (midiAccess: any) => {
      this.midiInputs = midiAccess.inputs;

      midiAccess.inputs.forEach((entry: any) => {
        entry.onmidimessage = onMIDIMessage;
      });
    }


    function listInputsAndOutput(midiAccess: any) {
      for (const entry of midiAccess.inputs) {
        const input = entry[1];
        console.log(
          `Input port [type:'${input.type}']` +
          ` id:'${input.id}'` +
          ` manufacturer:'${input.manufacturer}'` +
          ` name:'${input.name}'` +
          ` version:'${input.version}'`,
        );
      }
      for (const entry of midiAccess.outputs) {
        const output = entry[1];
        console.log(output);
        //  `Output port [type:'${output.type}'] id:'${output.id}' manufacturer:'${output.manufacturer}' name:'${output.name}' version:'${output.version}'`,
        // );
      }
    }


    function onMIDIFailure(fail: any) {
      console.log('Could not access your MIDI devices.');
      console.log(fail);
    }
  }

  getSettings(): SynthSettings {
    return new SynthSettings(
      this.numberOfOscillators,
      this.oscillatorsGrp.getSettings(),
      this.oscillators2Grp.getSettings(),
      this.filtersGrp.getSettings(),
      this.noise.getSettings(),
      this.ringModulator.getSettings(),
      this.reverb.getSettings(),
      this.phasor.getSettings(),
      this.masterVolume.getSettings(),
      this.analyser.getSettings());
  }

  protected saveConfig(fileName: string) {
    this.rest.saveConfig(this.getSettings(), fileName).subscribe({
      next: (v) => console.log("next: " + v),
      error: (e) => console.log(e),
      complete: () => console.log("complete")
    });
  }

  downKeys: Set<number> = new Set();

  protected computerKeydown($event: KeyboardEvent) {
    let code = this.keyCode($event);
    if (code >= 0) {
      code += 48;
      if (!this.downKeys.has(code)) {
        this.downKeys.add(code);
        this.keydown(code, 127);
      }
    }
  }

  protected keydown(code: number, velocity: number) {
    this.oscillatorsGrp.keyDown(code, velocity);
    this.oscillators2Grp.keyDown(code, velocity);
    this.filtersGrp.keyDown(code, velocity);
    this.noise.keyDown(code, velocity);
  }

  protected computerKeyUp($event: KeyboardEvent) {
    let code = this.keyCode($event);
    if (code >= 0) {
      code += 48;
      if (this.downKeys.has(code))
        this.downKeys.delete(code);
      this.keyup(code);
    }
  }

  protected keyup(code: number) {
    this.oscillatorsGrp.keyUp(code)
    this.oscillators2Grp.keyUp(code)
    this.filtersGrp.keyUp(code);
    this.noise.keyUp(code);
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

  private pitchBend(value: number) {
    this.oscillatorsGrp.midiPitchBend(value);
    this.oscillators2Grp.midiPitchBend(value);
    this.filtersGrp.midiPitchBend(value);
  }

  private modLevel(value: number) {
    value *= 300 / 127;
    this.oscillatorsGrp.midiModLevel(value);
    this.oscillators2Grp.midiModLevel(value);
    this.filtersGrp.midiModLevel(value);
  }

  private setMasterVolume(value: number) {
    value /= 127;
    this.masterVolume.setVolume(value);
  }

  protected setOscOutputTarget($event: string) {
    this.oscillatorsGrp.disconnect();
    switch ($event) {
      case 'speaker':
        this.oscillatorsGrp.connect(this.masterVolume.node());
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
        this.oscillators2Grp.connect(this.masterVolume.node());
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
        this.filtersGrp.connect(this.masterVolume.node());
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
        this.noise.connect(this.masterVolume.node());
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
        this.ringModulator.connect(this.masterVolume.node());
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
        this.reverb.connect(this.masterVolume.node());
        break;
      case 'off':
        break;
    }
  }

  protected setPhasorOutputTarget($event: string) {
    this.phasor.disconnect();
    switch ($event) {
      case 'speaker':
        this.phasor.connect(this.masterVolume.node());
        break;
      case 'reverb':
        this.phasor.connect(this.reverb.input);
        break;
      case 'off':
        break;
    }
  }

  protected showHomeForm() {
    this.router.navigate(['/home']).then();
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
    let vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) - topClearance;

    console.log("client width = " + vw + " client height = " + vh);
    console.log("width = " + window.innerWidth + " height = " + window.innerHeight);
    const requiredWidth = 2350;
    const requiredHeight = 1300 - topClearance;
    if (vw < requiredWidth || vh < requiredHeight) {
      synth.style.transformOrigin = `0 ${topClearance}px`;
      if (vw / requiredWidth < vh / requiredHeight)
        synth.style.transform = `scale(${vw / requiredWidth})`;
      else
        synth.style.transform = `scale(${vh / requiredHeight})`;
    } else
      synth.style.transform = `scale(1)`;
  }

  async ngAfterViewInit(): Promise<void> {
    if(!this.configFileName)
      await this.start(null);
    else {
      this.rest.getSettings(this.configFileName).subscribe({
        next: (v) => this.settings = v,
        error: (e) => console.log(e),
        complete: async () => {
          console.log("complete: settings loaded");
          await this.start(this.settings);
        }
      });
    }
    await this.requestWakeLock()
    this.scaleToFitSmallWindow();
    window.onresize = () => {
      this.scaleToFitSmallWindow();
    }
  }

  async ngOnDestroy(): Promise<void> {
    await this.releaseWakeLock();
    this.ringModulator.disconnect();
    this.reverb.disconnect();
    this.phasor.disconnect();

    this.midiInputs.forEach(input => {
      input.close();
    });
    window.onresize = null;
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
  }
}
