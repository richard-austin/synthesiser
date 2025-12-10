import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {Reverb} from '../modules/reverb';

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
  attackTime = 0;
  decayTime = 2;
  predelay = 0;
  repeatEchoTime = 0.7;
  repeatEchoGain = 0.3;
  @ViewChild('reverbOnOffForm') reverbOnOffForm!: ElementRef<HTMLFormElement>;



  protected readonly dialStyle = dialStyle;

  start(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
    this.input = this.audioCtx.createGain();
    this.input.gain.value = 1;
    this.gain = this.audioCtx.createGain();
    this.gain.gain.value = 0;
    this.reverb = new Reverb(audioCtx, this.input, this.gain, this.gain);
    this.reverb.setup(this.attackTime, this.decayTime, this.predelay, this.repeatEchoTime, this.repeatEchoGain);
    this.gain.connect(audioCtx.destination);
  }

  protected setAttackTime($event: number) {
    this.attackTime = $event * 10;
    this.reverb.setAttack(this.attackTime);
    this.reverb.renderTail();
  }

  protected setDecayTime($event: number) {
    this.decayTime = $event * 10;
    this.reverb.setDecay(this.decayTime);
    this.reverb.renderTail();
  }

  protected setPreDelayTime($event: number) {
    this.predelay = $event;
    this.reverb.setPreDelay($event);
  }

  protected setRepeatEchoTime($event: number) {
    this.repeatEchoTime = $event;
    this.reverb.setRepeatEchoTime($event);
  }

  protected setRepeatEchoGain($event: number) {
    this.repeatEchoGain = $event;
    this.reverb.setRepeatEchoGain(this.repeatEchoGain);
  }


  protected setWetDryBalance($event: number) {
    this.reverb.setWetGain(0.5-$event);
    this.reverb.setDryGain(0.5+$event);
  }


  private reverbOnOff(reverb: boolean) {
      this.gain.gain.value = reverb ? 1 : 0;
  }

  ngAfterViewInit(): void {
    const reverbOnOff = this.reverbOnOffForm.nativeElement;
    for (let i = 0; i < reverbOnOff.elements.length; ++i) {
      reverbOnOff.elements[i].addEventListener('change', ($event) => {
        // @ts-ignore
        const value = $event.target.value;
        this.reverbOnOff(value === 'on');
      });
    }
  }
}
