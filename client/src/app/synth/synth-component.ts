import {
  AfterViewInit,
  Component, effect, EffectRef,
  ElementRef,
  Input,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren, WritableSignal
} from '@angular/core';
import {FilterComponent} from "../filter/filter-component";
import {OscillatorComponent} from "../oscillator/oscillator.component";
import {NoiseComponent} from '../noise/noise-component';
import {RingModulatorComponent} from '../ring-modulator/ring-modulator-component';
import {ReverbComponent} from '../reverb-component/reverb-component';
import {PhaserComponent} from '../phaser/phaser.component';
import {AnalyserComponent} from '../analyser/analyser-component';
import {GeneralComponent} from '../general/general.component';
import {SynthSettings} from '../settings/synth-settings';
import {RestfulApiService} from '../services/restful-api.service';
import {OscillatorParams} from '../modules/oscillator';
import {OscillatorSettings} from '../settings/oscillator';
import {FilterSettings} from '../settings/filter';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {Cookies} from '../settings/cookies/cookies';
import {SynthComponentSettings} from '../settings/synth-component-settings';

@Component({
  selector: 'app-synth-component',
  imports: [
    FilterComponent,
    OscillatorComponent,
    NoiseComponent,
    RingModulatorComponent,
    ReverbComponent,
    PhaserComponent,
    AnalyserComponent,
    GeneralComponent
  ],
  templateUrl: `./synth-component.html`,
  styleUrl: './synth-component.scss',
})
export class SynthComponent implements AfterViewInit, OnDestroy {
  audioCtx!: AudioContext;
  public static readonly oscillatorParams: OscillatorParams[] = [
    new OscillatorParams("signal", 1),
    new OscillatorParams("mod", 2),
    new OscillatorParams("signal", 3),
    new OscillatorParams("signal", 4),
  ];
  protected _oscillatorParams = SynthComponent.oscillatorParams;
  midiInputs: MIDIInput[] = [];
  settings: SynthSettings | null = null;
  proxySettings!: SynthComponentSettings;
  cookies: Cookies
  fileNameEffectRef!: EffectRef;
  homeControlEffectRef!: EffectRef;

  private started = false;

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

  @Input() filename!: WritableSignal<string>;
  @Input() homeComponentControl!: WritableSignal<boolean>;

  @ViewChildren(OscillatorComponent) oscillatorsGrp!: QueryList<OscillatorComponent>;
  @ViewChild('oscillatorSelectForm') oscillatorSelectForm!: ElementRef<HTMLFormElement>;
  @ViewChild('oscillatorWindow') oscillatorWindow!: ElementRef<HTMLDivElement>;
  @ViewChild('filterWindow') filterWindow!: ElementRef<HTMLDivElement>;
  @ViewChildren(FilterComponent) filtersGrp!: QueryList<FilterComponent> | undefined;
  @ViewChild(NoiseComponent) noise!: NoiseComponent;
  @ViewChild(RingModulatorComponent) ringModulator!: RingModulatorComponent;
  @ViewChild(ReverbComponent) reverb!: ReverbComponent;
  @ViewChild(PhaserComponent) phaser!: PhaserComponent;
  @ViewChild(AnalyserComponent) analyser!: AnalyserComponent;
  @ViewChild('synth') synth!: ElementRef<HTMLDivElement>;
  @ViewChild('general') masterVolume!: GeneralComponent;

  constructor(private rest: RestfulApiService) {
    this.audioCtx = new AudioContext();
    this.fileNameEffectRef = effect(() => {
      const fileName = this.filename();
      if (fileName !== "") {
        this.rest.getSettings(fileName).subscribe({
          next: (v) => this.settings = v,
          error: (e) => console.log(e),
          complete: async () => {
            console.log("complete: settings loaded");
            await this.start(this.settings);
          }
        });
      }
    });

    this.homeControlEffectRef = effect(() => {
      this.homeComponentControl();
      const synth = this.synth?.nativeElement;
      if(synth) {
        synth.setAttribute('style', 'opacity:' + (this.homeComponentControl() ? "0.2" : "1")+'; pointer-events:' + (this.homeComponentControl() ? "none" : "auto"));
      }
    });

    this.cookies = new Cookies();
  }

  protected async start(settings: SynthSettings | null): Promise<void> {
    const cookieName = 'synthComponent';

    if (!settings) {
      let synthComponentSettings = new SynthComponentSettings();
      const savedSettings = this.cookies.getSettings(cookieName, synthComponentSettings);

      if (Object.keys(savedSettings).length > 0) {
        // Use values from cookie
        synthComponentSettings = savedSettings as SynthComponentSettings;
      }
      // else use default settings
      this.proxySettings = this.cookies.getSettingsProxy(synthComponentSettings, cookieName);
    } else
      this.proxySettings = this.cookies.getSettingsProxy(settings.synthComponentSettings, cookieName);


    // Start the module components
    this.filtersGrp?.forEach((filter, i) => filter.start(this.audioCtx, settings ? settings.filterSettings[i] : settings));

    await this.noise.start(this.audioCtx, settings ? settings.noiseSettings : settings);
    this.ringModulator.start(this.audioCtx, settings ? settings.ringModSettings : settings);
    this.reverb.start(this.audioCtx, settings ? settings.reverbSettings : settings);
    await this.phaser.setUp(this.audioCtx, settings ? settings.phasorSettings : settings);
    await this.analyser.start(this.audioCtx, settings ? settings.analyserSettings : settings);
    this.masterVolume.start(this.audioCtx, settings ? settings.generalSettings : settings);
    this.masterVolume.connect(this.analyser.node())

    // Connect the module component outputs
    this.oscillatorsGrp.forEach((oscillator, i) => {
      oscillator.start(this.audioCtx, settings ? settings.oscillatorSettings[i] : settings);

      // Finish setting up the oscillators, as they cross-reference each other, we need to call start on them first
      // this.oscillator.setModulators(this.oscillators2Grp);
      // this.oscillators2Grp.setModulators(this.oscillatorsGrp);
      oscillator.setOutputConnection();
    });

    SetRadioButtons.set(this.oscillatorSelectForm, this.proxySettings.selectedOscillator);

    this.ringModulator.setOutputConnection();
    this.noise.setOutputConnection();
    this.filtersGrp?.forEach(filter => filter.setOutputConnection());
    this.reverb.setOutputConnection();
    this.phaser.setOutputConnection();

    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("keyup", this.keyupHandler);

    if (!this.started) {
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
              //  console.log("Key up/down = " + performance.now());
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
      this.started = true;
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
    const oscSettings: OscillatorSettings[] = [];
    this.oscillatorsGrp.forEach(oscillator => {
      oscSettings.push(oscillator.getSettings());
    });
    const filterSettings: FilterSettings[] = [];
    this.filtersGrp?.forEach(filter => {
      filterSettings.push(filter.getSettings());
    });

    return new SynthSettings(
      this.proxySettings,
      oscSettings,
      filterSettings,
      this.noise.getSettings(),
      this.ringModulator.getSettings(),
      this.reverb.getSettings(),
      this.phaser.getSettings(),
      this.masterVolume.getSettings(),
      this.analyser.getSettings());
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
    this.oscillatorsGrp.forEach(osc => osc.keyDown(code, velocity));

    // this.filtersGrp.keyDown(code, velocity);
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
    this.oscillatorsGrp.forEach(osc => osc.keyUp(code));
    //this.filtersGrp.keyUp(code);
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
    this.oscillatorsGrp.forEach(osc => osc.midiPitchBend(value));
    this.filtersGrp?.forEach(filter => filter.midiPitchBend(value));
  }

  private modLevel(value: number) {
    value *= 300 / 127;
    this.oscillatorsGrp.forEach(osc => osc.midiModLevel(value));
    this.filtersGrp?.forEach(filter => filter.midiModLevel(value));
  }

  private setMasterVolume(value: number) {
    value /= 127;
    this.masterVolume.setVolume(value);
  }

  protected setOscOutputTarget($event: string, oscNumber: number) {
    const osc = this.oscillatorsGrp.get(oscNumber) as OscillatorComponent;

    osc.disconnect();
    switch ($event) {
      case 'speaker':
        osc.connect(this.masterVolume.node());
        break;
      case 'ringmod':
        false
        osc.connectToRingMod();
        break;
      case 'filter':
        osc.connectToFilters();
        break;
      case 'reverb':
        osc.connectToReverb();
        break;
      case 'phasor':
        osc.connectToPhaser();
        break
      case 'off':
        break;
      default:
        console.error('Unknown oscillator output destination');
    }
  }

  protected setFilterOutputTarget($event: string, index: number) {
    const filter = this.filtersGrp?.get(index);

    if (filter) {
      filter.disconnect();
      switch ($event) {
        case 'speaker':
          filter.connect(this.masterVolume.node());
          break;
        case 'ringmod':
          filter.connectToRingMod();
          break;
        case 'reverb':
          filter.connectToReverb();
          break;
        case 'phasor':
          filter.connectToPhasor();
          break;
        case 'off':
          break;
        default:
          console.error('Unknown filter output destination');
      }
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
    this.phaser.disconnect();
    switch ($event) {
      case 'speaker':
        this.phaser.connect(this.masterVolume.node());
        break;
      case 'reverb':
        this.phaser.connect(this.reverb.input);
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
    const oscillatorWindow = this.oscillatorWindow.nativeElement;
    const filterWindow = this.filterWindow.nativeElement;

    const oscillatorSelectForm = this.oscillatorSelectForm.nativeElement;
    for (let i = 0; i < oscillatorSelectForm.elements.length; ++i) {
      oscillatorSelectForm.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value - 1;
        oscillatorWindow.scroll({left: 0, top: value * 979.3, behavior: 'instant'});
        filterWindow.scroll({left: 0, top: value * 980, behavior: 'instant'});
        this.proxySettings.selectedOscillator = (value + 1).toString();
      });
    }

    await this.start(null);
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
    this.phaser.disconnect();
    // this.noise.disconnect();
    await this.audioCtx.close();
    this.midiInputs.forEach(input => {
      input.close();
    });
    window.onresize = null;
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    this.fileNameEffectRef.destroy();
    this.homeControlEffectRef.destroy();
  }

  protected readonly FilterComponent = FilterComponent;
}
