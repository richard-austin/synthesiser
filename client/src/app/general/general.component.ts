import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  signal,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {LevelControlComponent} from "../level-control/level-control.component";
import {dialStyle} from '../level-control/levelControlParameters';
import {Cookies} from '../settings/cookies/cookies';
import {MasterVolumeSettings} from '../settings/master-volume';
import {GainEnvelopeBase} from '../modules/gain-envelope-base';
import {timer} from 'rxjs';
import {FormsModule} from '@angular/forms';


@Component({
  selector: 'app-master-volume',
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
  private proxySettings!: MasterVolumeSettings;
  private cookies!: Cookies;
  protected showConfigEditor: boolean = false;
  protected addConfigMode: boolean = false;
  protected deleteConfigMode: boolean = false;
  protected configFileName: string = "";
  protected fileToDelete: string = "";

  @ViewChild('masterVolume') masterVolume!: LevelControlComponent;
  @ViewChild('configEditor') configEditor!: ElementRef<HTMLDivElement>;
  @ViewChild('general') general!: ElementRef<HTMLDivElement>;

  animationEnter = signal('enter-animation');
  animationLeave = signal('leaving-animation');



  constructor(private cdr: ChangeDetectorRef) {

  }

  start(audioCtx: AudioContext): boolean {
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
    this.applySettings();
    return ok;
  }

  applySettings(settings: MasterVolumeSettings = new MasterVolumeSettings()) {
    const cookieName = 'masterVolume';

    const savedSettings = this.cookies.getSettings(cookieName, settings);

    if (Object.keys(savedSettings).length > 0) {
      // Use values from cookie
      settings = savedSettings as MasterVolumeSettings;
    }
    // else use default settings
    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);
    this.masterVolume.setValue(this.proxySettings.level);
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

  protected manageConfigurations($event: PointerEvent) {
    this.showConfigEditor = !this.showConfigEditor;
    if(this.showConfigEditor) {
      const sub = timer(0).subscribe(() => {
        if (this.configEditor) {
          sub.unsubscribe();
          const configEditor = this.configEditor.nativeElement;
          configEditor.style.top = -configEditor.scrollHeight + 'px';
        }
      });
    }
    else {
      this.addConfigMode = this.deleteConfigMode = false;
    }
  }
  protected confirmAddConfig() {
    this.addConfigMode = false;
    console.log(this.configFileName);
  }

  protected confirmDeleteConfig() {
    this.deleteConfigMode = false;
    console.log(this.fileToDelete);
  }

  private clickAwayHandler($event: MouseEvent) {
    const target = $event.target as HTMLElement;
    const general = this.general?.nativeElement;
    if (!general?.contains(target)) {
      this.addConfigMode = this.deleteConfigMode = this.showConfigEditor = false;
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    window.addEventListener('mousedown', (evt) => this.clickAwayHandler(evt));
  }

  ngOnDestroy(): void {
    this.volume.disconnect();
    window.removeEventListener('mousedown', () => this.clickAwayHandler);
  }

}
