import {Component, ElementRef, ViewChild} from '@angular/core';

@Component({
  selector: 'app-oscillator-module',
  imports: [],
  templateUrl: './oscillator-module.html',
  styleUrl: './oscillator-module.scss',
})
export class OscillatorModule {
@ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
}
