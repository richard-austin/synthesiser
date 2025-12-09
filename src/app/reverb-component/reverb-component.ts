import {AfterViewInit, Component} from '@angular/core';
import {LevelControlComponent} from '../level-control/level-control.component';
import {dialStyle} from '../level-control/levelControlParameters';
import {Reverb} from '../modules/reverb';
import {Subscription, timer} from 'rxjs';

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

  protected readonly dialStyle = dialStyle;

  start(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
    this.input = this.audioCtx.createGain();
    this.input.gain.value = 1;
    this.reverb = new Reverb(audioCtx, this.input, audioCtx.destination);
    this.reverb.setup(this.attackTime, this.decayTime, this.predelay, this.repeatEchoTime, this.repeatEchoGain);
  }

  sub: Subscription | null = null;

  here:Reverb[] = [];
  applyChange(): void {
    if (this.sub)
      this.sub.unsubscribe();

    this.sub = timer(20).subscribe(() => {
      this.reverb.disconnectInput();
      this.here.push(this.reverb);
      //this.reverb.tearDown();
      // @ts-ignore
     // this.reverb = undefined;
      this.reverb = new Reverb(this.audioCtx, this.input, this.audioCtx.destination);
      this.reverb.setup(this.attackTime, this.decayTime, this.predelay, this.repeatEchoTime, this.repeatEchoGain);
      console.log("Hello");
      if (this.sub) {
        this.sub.unsubscribe();
        this.sub = null;
      }
    });
  }

  protected setAttackTime($event: number) {
    this.attackTime = $event * 10;
    this.applyChange();
  }

  protected setDecayTime($event: number) {
    this.decayTime = $event * 10;
    this.applyChange();
  }

  protected setPreDelayTime($event: number) {
    this.predelay = $event;
    this.applyChange();
  }

  protected setRepeatEchoTime($event: number) {
    this.repeatEchoTime = $event;
    this.applyChange();
  }

  protected setRepeatEchoGain($event: number) {
    this.repeatEchoGain = $event * 0.5;
    this.applyChange();
  }

  protected setWetDryBalance($event: number) {

  }
  ngAfterViewInit(): void {
  }
}
