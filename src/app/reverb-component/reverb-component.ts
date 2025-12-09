import { Component } from '@angular/core';
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
export class ReverbComponent {
    audioCtx!: AudioContext;
    reverb!: Reverb;
    input!: GainNode;

  protected readonly dialStyle = dialStyle;

  start(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
    this.input = this.audioCtx.createGain();
    this.input.gain.value = 1;

    this.reverb = new Reverb(audioCtx, this.input, audioCtx.destination);
  }


  protected setReverbTime($event: number) {

  }

  protected setPreDelay($event: number) {

  }

  protected setReverbAttackTime($event: number) {

  }

  protected setWetDryBalance($event: number) {

  }
}
