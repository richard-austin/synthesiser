import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef, output,
  OnDestroy,
  signal,
  viewChild,
  ViewEncapsulation, inject, effect, EffectRef
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


@Component({
  selector: 'app-general',
  imports: [
    LevelControlComponent,
    FormsModule,
  ],
  templateUrl: './general.component.html',
  styleUrl: './general.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class GeneralComponent implements AfterViewInit, OnDestroy {
  protected readonly dialStyle = dialStyle;
  private compressor!: DynamicsCompressorNode;
  private volume!: GainNode;
  protected proxySettings!: GeneralSettings;
  protected showConfigEditor: boolean = false;
  protected addConfigMode: boolean = false;
  protected configFileName: string = "";
  protected _confirmOverwrite: boolean = false;
  protected errorMessage: string = "";
  protected failed: boolean = false;
  protected success: boolean = false;
  public static readonly _configFileNameRegex = /^[a-zA-Z]\w{0,14}( ?\w){1,14}$/
  protected readonly configFileNameRegex = GeneralComponent._configFileNameRegex;

  saveConfig = output<string>();

  masterVolume = viewChild.required<LevelControlComponent>('masterVolume');
  configEditor = viewChild.required<ElementRef<HTMLDivElement>>('configEditor');
  general = viewChild.required<ElementRef<HTMLDivElement>>('general');

  animationEnter = signal('enter-animation');
  animationLeave = signal('leaving-animation');
  private readonly indexedDBService: IndexedDBService = inject(IndexedDBService);
  private signalService: SignalService = inject(SignalService);
  private renameEffectRef!:EffectRef;

  constructor(private cdr: ChangeDetectorRef, private parent: SynthComponent, private rest: RestfulApiService) {

    this.renameEffectRef = effect(() => {
      // @ts-ignore
      if(this.signalService.rename() && this.proxySettings && this.signalService.rename().oldName === this.proxySettings.configFileName)
      { // @ts-ignore
        this.proxySettings.configFileName = this.signalService.rename().newName;
      }
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

  node(): DynamicsCompressorNode {
    return this.compressor;
  }

  connect(node: AudioNode) {
    this.volume.connect(node);
  }

  protected manageConfigurations() {
    this.addConfigMode = this.showConfigEditor = !this.showConfigEditor;
    if (this.showConfigEditor) {
      const sub = timer(0).subscribe(() => {
        if (this.configEditor()) {
          sub.unsubscribe();
          const configEditor = this.configEditor().nativeElement;
          configEditor.style.top = -configEditor.scrollHeight + 'px';
        }
      });
    } else {
      this.addConfigMode = false;
    }
  }

  protected addConfiguration(configFileName: string, overwrite: boolean = false) {
    this.success = this.failed = false;
    this.proxySettings.configFileName = configFileName;
    this.addConfigMode = false;
    this.rest.saveConfig(this.parent.getSettings(), configFileName, overwrite).subscribe({
      next: (v: any) => console.log("next: " + v.message),
      error: (e) => {
        if (e.status === 400) {  // Status 400 means file already exists so confirm overwrite
          this._confirmOverwrite = true;
          this.cdr.detectChanges();
        } else {
          this.addConfigMode = this.showConfigEditor = false;
          console.log(e.error.message)
          this.failed = true;
          this.errorMessage = e.error.message;
          this.cdr.detectChanges();
        }
      },
      complete: () => {
        this.showConfigEditor = false;
        console.log("complete");
        this.success = true;
        this.cdr.detectChanges();
      }
    });
  }

  private clickAwayHandler($event: MouseEvent) {
    const target = $event.target as HTMLElement;
    const general = this.general()?.nativeElement;
    if (!general?.contains(target)) {
      this.addConfigMode = this.showConfigEditor = false;
      this.cdr.detectChanges();
    }
  }

  cancel() {
    this.success = this.failed = false;
    this.addConfigMode = this.showConfigEditor = false;
  }

  ngAfterViewInit(): void {
    window.addEventListener('mousedown', (evt) => this.clickAwayHandler(evt));
  }

  ngOnDestroy(): void {
    this.volume.disconnect();
    window.removeEventListener('mousedown', () => this.clickAwayHandler);
    this.renameEffectRef.destroy();
  }

  protected showConfigLoadForm() {
    this.signalService.configFileComponentControl.set(!this.signalService.configFileComponentControl());
  }
}
