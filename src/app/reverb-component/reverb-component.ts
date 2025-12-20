import {AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {Reverb} from '../modules/reverb';
import {ReverbSettings} from '../settings/reverb';
import {onOff} from '../enums/enums';
import {SetRadioButtons} from '../settings/set-radio-buttons';
import {Cookies} from '../settings/cookies/cookies';

@Component({
  selector: 'app-reverb-component',
  imports: [
    LevelControlComponent
  ],
  templateUrl: './reverb-component.html',
  styleUrl: './reverb-component.scss',
})
export class ReverbComponent implements AfterViewInit {
  audioCtx!: AudioContext;
  reverb!: Reverb;
  gain!: GainNode;
  input!: GainNode;
  proxySettings!: ReverbSettings;
  private cookies!: Cookies;

  @Output() output = new EventEmitter();

  @ViewChild('reverbOnOffForm') reverbOnOffForm!: ElementRef<HTMLFormElement>;
  @ViewChild('attackTime') attackTimeDial!: LevelControlComponent;
  @ViewChild('decayTime') decayTimeDial!: LevelControlComponent;
  @ViewChild('predelay') predelayDial!: LevelControlComponent;
  @ViewChild('repeatEchoTime') repeatEchoTimeDial!: LevelControlComponent;
  @ViewChild('repeatEchoLevel') repeatEchoLevelDial!: LevelControlComponent;
  @ViewChild('wetDry') wetDryDial!: LevelControlComponent;

  protected readonly dialStyle = dialStyle;

  start(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
    this.input = this.audioCtx.createGain();
    this.input.gain.value = 1;
    this.gain = this.audioCtx.createGain();
    this.gain.gain.value = 1;
    this.reverb = new Reverb(audioCtx, this.input, this.gain, this.gain);
    this.cookies = new Cookies();
    this.applySettings();
  }

  // Called after all synth components have been started
  setOutputConnection() {
    SetRadioButtons.set(this.reverbOnOffForm, this.proxySettings.output);
  }

  applySettings(settings: ReverbSettings = new ReverbSettings()) {
    const cookieName = 'reverb'
    const savedSettings = this.cookies.getSettings(cookieName);

    if (Object.keys(savedSettings).length > 0) {
      // Use values from cookie
      settings = savedSettings as ReverbSettings;
    }

    this.proxySettings = this.cookies.getSettingsProxy(settings, cookieName);
    this.reverb.setup(this.proxySettings.attackTime, this.proxySettings.decayTime, this.proxySettings.predelay, this.proxySettings.repeatEchoTime, this.proxySettings.repeatEchoGain);
    this.attackTimeDial.setValue(this.proxySettings.attackTime);
    this.decayTimeDial.setValue(this.proxySettings.decayTime);
    this.predelayDial.setValue(this.proxySettings.predelay);
    this.repeatEchoTimeDial.setValue(this.proxySettings.repeatEchoTime);
    this.repeatEchoLevelDial.setValue(this.proxySettings.repeatEchoGain);
    this.wetDryDial.setValue(this.proxySettings.wetDry);
  }

  protected setAttackTime($event: number) {
    this.proxySettings.attackTime = $event;
    this.reverb.setAttack(this.proxySettings.attackTime);
    this.reverb.renderTail();
  }

  protected setDecayTime($event: number) {
    this.proxySettings.decayTime = $event;
    this.reverb.setDecay(this.proxySettings.decayTime);
    this.reverb.renderTail();
  }

  protected setPreDelayTime($event: number) {
    this.proxySettings.predelay = $event;
    this.reverb.setPreDelay($event);
  }

  protected setRepeatEchoTime($event: number) {
    this.proxySettings.repeatEchoTime = $event;
    this.reverb.setRepeatEchoTime($event);
  }

  protected setRepeatEchoGain($event: number) {
    this.proxySettings.repeatEchoGain = $event;
    this.reverb.setRepeatEchoGain(this.proxySettings.repeatEchoGain);
  }


  protected setWetDryBalance($event: number) {
    this.reverb.setWetGain(0.5 - $event);
    this.reverb.setDryGain(0.5 + $event);
  }

  connect(node: AudioNode) {
    this.gain.connect(node);
  }

  disconnect() {
    this.gain.disconnect();
  }

  ngAfterViewInit(): void {
    const reverbOnOff = this.reverbOnOffForm.nativeElement;
    for (let i = 0; i < reverbOnOff.elements.length; ++i) {
      reverbOnOff.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.proxySettings.output = value as onOff;
        this.output.emit(value);
      });
    }
  }
}
