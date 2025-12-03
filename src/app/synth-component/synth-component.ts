import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {FilterComponent} from "../filter/filter-component";
import {OscillatorComponent} from "../oscillator/oscillator.component";

@Component({
  selector: 'app-synth-component',
    imports: [
        FilterComponent,
        OscillatorComponent
    ],
  templateUrl: './synth-component.html',
  styleUrl: './synth-component.scss',
})
export class SynthComponent implements AfterViewInit {
  audioCtx!: AudioContext;
  @ViewChild(OscillatorComponent) oscillatorsGrp!: OscillatorComponent
  @ViewChild(FilterComponent) filtersGrp!: FilterComponent;

  protected start(): void {
    this.audioCtx = new AudioContext();
    this.oscillatorsGrp.audioCtx = this.audioCtx;
    this.oscillatorsGrp.start();
    this.filtersGrp.audioCtx = this.audioCtx;
    this.filtersGrp.start();
    this.oscillatorsGrp.connect(this.audioCtx.destination);
    window.addEventListener('click', () => {
    })
    window.addEventListener("keydown", (e) => {
      if (/^[abcdefghijklmnopqrstuvwxyz,.\/]$/.test(e.key)) {
        e.preventDefault();
        this.keydown(e);
      }
    });
    window.addEventListener("keyup", (e) => {
      if (/^[abcdefghijklmnopqrstuvwxyz,.\/]$/.test(e.key)) {
        e.preventDefault();
        this.keyup(e);
      }
    });

  }

  downKeys: Set<number> = new Set();

  protected keydown($event: KeyboardEvent) {
    const code = this.keyCode($event);
    if (code >= 0) {
      if (!this.downKeys.has(code)) {
        this.downKeys.add(code);
        this.oscillatorsGrp.keyDown(code);
        this.filtersGrp.keyDown(code);
        //this.o2[code].keyDown()
        //    this.filters[code].keyDown();
        // this.noises[code].attack();
      }
    }
  }

  protected keyup($event: KeyboardEvent) {
    const code = this.keyCode($event);
    if (code >= 0) {
      if (this.downKeys.has(code))
        this.downKeys.delete(code);
      this.oscillatorsGrp.keyUp(code)
      this.filtersGrp.keyUp(code);
      //   this.o2[code].keyUp()
      // this.filters[code].keyUp();
    }
    //  this.noises[code].release();
  }

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

  protected setOscOutputTarget($event: string) {
    this.oscillatorsGrp.disconnect();
    switch ($event) {
      case 'speaker':
        this.oscillatorsGrp.connect(this.audioCtx.destination);
        break;
      case 'ringmod':
        break;
      case 'filter':
        this.oscillatorsGrp.connectToFilters();
        break;
      case 'off':
        break;
      default:
        console.error('Unknown oscillator output destination');
    }
  }

  protected setFilterOutputTarget($event: string) {
    this.filtersGrp.disconnect();
    switch ($event) {
      case 'speaker':
        this.filtersGrp.connect(this.audioCtx.destination);
        break;
      case 'ringmod':
        break;
      case 'off':
        break;
      default:
        console.error('Unknown filter output destination');
    }

  }
  ngAfterViewInit(): void {
    this.start();
  }
}
