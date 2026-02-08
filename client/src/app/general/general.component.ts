import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef, EventEmitter,
  OnDestroy, Output,
  signal,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {LevelControlComponent} from "../level-control/level-control.component";
import {dialStyle} from '../level-control/levelControlParameters';
import {Cookies} from '../settings/cookies/cookies';
import {GeneralSettings} from '../settings/General';
import {GainEnvelopeBase} from '../modules/gain-envelope-base';
import {timer} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {SynthComponent} from '../synth/synth-component';
import {RestfulApiService} from '../services/restful-api.service';


@Component({
  selector: 'app-general',
  imports: [
    LevelControlComponent,
    FormsModule
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
  private cookies!: Cookies;
  protected showConfigEditor: boolean = false;
  protected addConfigMode: boolean = false;
  protected configFileName: string = "";
  protected _confirmOverwrite: boolean = false;
  protected errorMessage: string = "";
  protected failed: boolean = false;
  protected success: boolean = false;
  public static readonly _configFileNameRegex = /^[a-zA-Z]\w{0,14}( ?\w){1,14}$/
  protected readonly configFileNameRegex = GeneralComponent._configFileNameRegex;

  @Output() saveConfig: EventEmitter<string> = new EventEmitter();

  @ViewChild('masterVolume') masterVolume!: LevelControlComponent;
  @ViewChild('configEditor') configEditor!: ElementRef<HTMLDivElement>;
  @ViewChild('general') general!: ElementRef<HTMLDivElement>;

  animationEnter = signal('enter-animation');
  animationLeave = signal('leaving-animation');


  constructor(private cdr: ChangeDetectorRef, private parent: SynthComponent, private rest: RestfulApiService) {
  }

  start(audioCtx: AudioContext, settings: GeneralSettings | null): boolean {
    let ok = true;
    this.compressor = audioCtx.createDynamicsCompressor();
    this.compressor.knee.value = 40;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0;
    this.compressor.release.value = 0.25;

    this.volume = audioCtx.createGain();

    this.compressor.connect(this.volume);
    this.volume.connect(audioCtx.destination);
    this.cookies = new Cookies();
    this.applySettings(settings);
    return ok;
  }

  applySettings(settings: GeneralSettings | null) {
    const cookieName = 'masterVolume';

    if (!settings) {
      settings = new GeneralSettings();
      const savedSettings = this.cookies.getSettings(cookieName, settings);

      if (Object.keys(savedSettings).length > 0) {
        // Use values from cookie
        settings = savedSettings as GeneralSettings;
      }
      // else use default settings
    }
    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);
    this.configFileName = this.proxySettings.configFileName;
    this.masterVolume.setValue(this.proxySettings.level);
  }

  public getSettings(): GeneralSettings {
    return this.proxySettings;
  }

  protected setLevel($event: number) {
    this.proxySettings.level = $event
    this.volume.gain.value = GainEnvelopeBase.exponentiateGain($event);
  }

  setVolume(value: number) {
    this.masterVolume.setValue(value);
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
        if (this.configEditor) {
          sub.unsubscribe();
          const configEditor = this.configEditor.nativeElement;
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
    const general = this.general?.nativeElement;
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
  }

}
