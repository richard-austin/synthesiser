import {
  Component,
  ElementRef, output,
  signal,
  viewChild,
  ViewEncapsulation, inject, effect, EffectRef, afterNextRender, DestroyRef
} from '@angular/core';
import {LevelControlComponent} from "../level-control/level-control.component";
import {dialStyle} from '../level-control/levelControlParameters';
import {GeneralSettings} from '../settings/General';
import {timer} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {SynthComponent} from '../synth/synth-component';
import {RestfulApiService} from '../services/restful-api.service';
import {IndexedDBService} from '../services/indexed-db-service';
import {SignalService} from '../services/signal-service';
import {FmSynthService} from '../services/fm-synth-service';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {toObservable} from '@angular/core/rxjs-interop';


@Component({
  selector: 'app-general',
  imports: [
    LevelControlComponent,
    FormsModule,
  ],
  templateUrl: './general.component.html',
  styleUrl: './general.component.scss',
  encapsulation: ViewEncapsulation.None,
  standalone: true
})
export class GeneralComponent {
  protected readonly dialStyle = dialStyle;
  private compressor!: DynamicsCompressorNode;
  private volume!: GainNode;
  protected proxySettings!: GeneralSettings;
  protected showConfigEditor = signal<boolean>(false);
  protected addConfigMode = signal<boolean>(false);
  protected configFileName: string = "";
  protected _confirmOverwrite = signal<boolean>(false);
  protected errorMessage: string = "";
  protected failed = signal<boolean>(false);
  protected success = signal<boolean>(false);
  public static readonly _configFileNameRegex = /^[a-zA-Z]\w{0,14}( ?\w){1,14}$/
  protected readonly configFileNameRegex = GeneralComponent._configFileNameRegex;

  saveConfig = output<string>();

  masterVolume = viewChild.required<LevelControlComponent>('masterVolume');
  configEditor = viewChild.required<ElementRef<HTMLDivElement>>('configEditor');
  general = viewChild.required<ElementRef<HTMLDivElement>>('general');
  synthesiserModeForm = viewChild.required<ElementRef<HTMLFormElement>>('synthesiserModeForm');

  animationEnter = signal('enter-animation');
  animationLeave = signal('leaving-animation');
  private readonly indexedDBService: IndexedDBService = inject(IndexedDBService);
  private signalService: SignalService = inject(SignalService);
  private fmSynthService = inject(FmSynthService);
  private destroyRef = inject(DestroyRef);

  private renameEffectRef!:EffectRef;

  constructor(private parent: SynthComponent, private rest: RestfulApiService) {

    this.renameEffectRef = effect(() => {
      // @ts-ignore
      if(this.signalService.rename() && this.proxySettings && this.signalService.rename().oldName === this.proxySettings.configFileName)
      { // @ts-ignore
        this.proxySettings.configFileName = this.signalService.rename().newName;
      }
    });

    afterNextRender({
      write: () => {
          window.addEventListener('mousedown', (evt) => this.clickAwayHandler(evt));
          const synthModeForm = this.synthesiserModeForm().nativeElement;
          for (let j = 0; j < synthModeForm.elements.length; ++j) {
          synthModeForm.elements[j].addEventListener('change', ($event) => {
            // @ts-ignore
            const value = $event.target.value;
            this.setSynthMode(value);
            this.proxySettings.synthesiserMode = value;
          });
        }
      }
    });

    this.destroyRef.onDestroy(() => {
      this.volume.disconnect();
      window.removeEventListener('mousedown', () => this.clickAwayHandler);
      this.renameEffectRef.destroy();
    });

    // Update slop state from changes made in the oscillators
    toObservable(this.signalService.slopSignal).subscribe((slop) => {
      if(this.proxySettings)
        this.proxySettings.slop = slop;
    });
  }

  async start(audioCtx: AudioContext, settings: GeneralSettings | null): Promise<boolean> {
    let ok = true;
    this.compressor = audioCtx.createDynamicsCompressor();
    this.compressor.threshold.value = -3;
    this.compressor.knee.value = 0;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0;
    this.compressor.release.value = 0.25;

    this.volume = audioCtx.createGain();

    this.compressor.connect(this.volume);
    this.volume.connect(audioCtx.destination);
    await this.applySettings(settings);
    return ok;
  }

  async applySettings(settings: GeneralSettings | null) {
    const objectName = 'masterVolume';

    if (!settings) {
      settings = new GeneralSettings();
      const savedSettings = await this.indexedDBService.getSynthObject(objectName);

      if (savedSettings && Object.keys(savedSettings).length > 0) {
        // Use values from cookie
        settings = savedSettings as GeneralSettings;
      }
      // else use default settings
    }
    this.proxySettings = this.indexedDBService.getSettingsProxy(settings, objectName);
    this.configFileName = this.proxySettings.configFileName;
    this.masterVolume().setValue(this.proxySettings.level);
    const synthesiserMode = this.proxySettings.synthesiserMode === undefined ? 'poly' : this.proxySettings.synthesiserMode;
    SetRadioButtons.set(this.synthesiserModeForm(), synthesiserMode);

    // This setting will be applied to the oscillators
    const slop = this.proxySettings.slop;
    this.signalService.slopSignal.set(slop == undefined ? true : slop);
  }

  public getSettings(): GeneralSettings {
    return this.proxySettings;
  }

  protected setLevel($event: number) {
    this.proxySettings.level = $event
    // Exponentiate the gain control
    this.volume.gain.value = (Math.pow(10, $event) - 1) / (Math.pow(10, 1) - 1);
  }

  setVolume(value: number) {
    this.masterVolume().setValue(value * 3);
  }

  get node(): DynamicsCompressorNode {
    return this.compressor;
  }

  connect(node: AudioNode) {
    this.volume.connect(node);
  }

  protected manageConfigurations() {
    this.showConfigEditor.set(!this.showConfigEditor());
    this.addConfigMode.set(this.showConfigEditor());
    if (this.showConfigEditor()) {
      const sub = timer(0).subscribe(() => {
        if (this.configEditor()) {
          sub.unsubscribe();
          const configEditor = this.configEditor().nativeElement;
          configEditor.style.top = -configEditor.scrollHeight + 'px';
        }
      });
    } else {
      this.addConfigMode.set(false);
    }
  }

  protected addConfiguration(configFileName: string, overwrite: boolean = false) {
    this.success.set(false);
    this.failed.set(false);

    this.proxySettings.configFileName = configFileName;
    this.addConfigMode.set(false);
    this.rest.saveConfig(this.parent.getSettings(), configFileName, overwrite).subscribe({
      next: (v: any) => console.log("next: " + v.message),
      error: (e) => {
        if (e.status === 400) {  // Status 400 means file already exists so confirm overwrite
          this._confirmOverwrite.set(true);
        } else {
          this.showConfigEditor.set(false);
          this.addConfigMode.set(false);
          console.log(e.error.message)
          this.failed.set(true);
          this.errorMessage = e.error.message;
        }
      },
      complete: () => {
        this.showConfigEditor.set(false);
        console.log("complete");
        this.success.set(true);
      }
    });
  }

  private clickAwayHandler($event: MouseEvent) {
    const target = $event.target as HTMLElement;
    const general = this.general()?.nativeElement;
    if (!general?.contains(target)) {
      this.addConfigMode.set(false);
      this.showConfigEditor.set(false);
    }
  }

  cancel() {
    this.success.set(false);
    this.failed.set(false);
    this.addConfigMode.set(false);
    this.showConfigEditor.set(false);
  }

  protected showConfigLoadForm() {
    this.signalService.configFileComponentControl.set(!this.signalService.configFileComponentControl());
  }

  protected setSynthMode(mode: 'mono' | 'poly') {
    this.fmSynthService.setSynthMode(mode);
    this.signalService.synthModeSignal.set(mode);
    this.proxySettings.synthesiserMode = mode;
  }
}
