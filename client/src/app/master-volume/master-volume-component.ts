import {Component, OnDestroy, ViewChild} from '@angular/core';
import {LevelControlComponent} from "../level-control/level-control.component";
import {dialStyle} from '../level-control/levelControlParameters';
import {Cookies} from '../settings/cookies/cookies';
import {MasterVolumeSettings} from '../settings/master-volume';
import {GainEnvelopeBase} from '../modules/gain-envelope-base';


@Component({
  selector: 'app-master-volume',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './master-volume-component.html',
  styleUrl: './master-volume-component.scss',
})
export class MasterVolumeComponent implements OnDestroy{
  protected readonly dialStyle = dialStyle;
  private compressor!: DynamicsCompressorNode;
  private volume!: GainNode;
  private proxySettings!: MasterVolumeSettings;
  private cookies!: Cookies;

  @ViewChild('masterVolume') masterVolume!: LevelControlComponent;

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
  ngOnDestroy(): void {
    this.volume.disconnect();
  }
}
