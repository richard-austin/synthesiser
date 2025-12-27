import {AfterViewInit, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit{

  // audioCtx: AudioContext;
  // osc: OscillatorNode;
  constructor() {
    // this.audioCtx = new AudioContext();
    // this.osc = this.audioCtx.createOscillator();
    // this.osc.frequency.value = 1;
    // this.osc.type = 'sine';
    // this.osc.start();
    // this.osc.connect(this.audioCtx.destination);
  }

  ngAfterViewInit(): void {
    // window.addEventListener("keydown", (e) => {
    //   if (/^[abcdefghijklmnopqrstuvwxyz,.\/]$/.test(e.key)) {
    //     e.preventDefault();
    //     this.keydown(e);
    //   }
    // });
    // window.addEventListener("keyup", (e) => {
    //   if (/^[abcdefghijklmnopqrstuvwxyz,.\/]$/.test(e.key)) {
    //     e.preventDefault();
    //     this.keyup(e);
    //   }
    // });

  }
  protected start() {
    window.location.href = 'polyphonicSynth';
  }

  keyToFrequency(key: number) {
    return 225 * Math.pow(Math.pow(2, 1 / 12), (key + 1) + 12);
  }


  downKeys: Set<number> = new Set();

  // protected keydown($event: KeyboardEvent) {
  //   const code = this.keyCode($event);
  //   if (code >= 0) {
  //     if (!this.downKeys.has(code)) {
  //       this.downKeys.add(code);
  //       this.osc.frequency.setValueAtTime(this.osc.frequency.value, this.audioCtx.currentTime);
  //       this.osc.frequency.exponentialRampToValueAtTime(this.keyToFrequency(code), this.audioCtx.currentTime+0.1);
  //     }
  //   }
  // }
  //
  // protected keyup($event: KeyboardEvent) {
  //   const code = this.keyCode($event);
  //   if (code >= 0) {
  //     if (this.downKeys.has(code))
  //       this.downKeys.delete(code);
  //   }
  // }

  keyCode(e: KeyboardEvent) {
    let code = 0;
    switch (e.key) {
      case 'q':
        code = 1;
        break;
      case 'w':
        code = 2;
        break;
      case 'e':
        code = 3;
        break;
      case 'r':
        code = 4;
        break;
      case 't':
        code = 5;
        break;
      case 'y':
        code = 6;
        break;
      case 'u':
        code = 7;
        break;
      case 'i':
        code = 8;
        break;
      case 'o':
        code = 9;
        break;
      case 'p':
        code = 10;
        break;
      case 'a':
        code = 11;
        break;
      case 's':
        code = 12;
        break;
      case 'd':
        code = 13;
        break;
      case 'f':
        code = 14;
        break;
      case 'g':
        code = 15;
        break;
      case 'h':
        code = 16;
        break;
      case 'j':
        code = 17;
        break;
      case 'k':
        code = 18;
        break;
      case 'l':
        code = 19;
        break;
      case 'z':
        code = 20;
        break;
      case 'x':
        code = 21;
        break;
      case 'c':
        code = 22;
        break;
      case 'v':
        code = 23;
        break;
      case 'b':
        code = 24;
        break;
      case 'n':
        code = 25;
        break;
      case 'm':
        code = 26;
        break;
      case ',':
        code = 27;
        break;
      case '.':
        code = 28;
        break;
      case '/':
        code = 29;
        break;
    }
    e.preventDefault();
    return code - 1;
  }


}
