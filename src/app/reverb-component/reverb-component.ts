import {AfterViewInit, Component} from '@angular/core';
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
  input!: GainNode;
  attackTime = 0;
  decayTime = 2;
  predelay = 0;
  repeatEchoTime = 0.7;
  repeatEchoGain = 0.3;
 // removalQueue: ReverbForRemoval[] = [];


  protected readonly dialStyle = dialStyle;

  start(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
    this.input = this.audioCtx.createGain();
    this.input.gain.value = 1;
    this.reverb = new Reverb(audioCtx, this.input, audioCtx.destination);
    this.reverb.setup(this.attackTime, this.decayTime, this.predelay, this.repeatEchoTime, this.repeatEchoGain);
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
    this.repeatEchoGain = $event * 0.5;
    this.reverb.setRepeatEchoGain(this.repeatEchoGain);
  }

  protected setWetDryBalance($event: number) {
  }

  ngAfterViewInit(): void {
  }
}
