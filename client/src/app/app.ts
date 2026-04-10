import {AfterViewInit, Component, ElementRef, signal, ViewChild, WritableSignal} from '@angular/core';
import {SynthComponent} from './synth/synth-component';
import {HomeComponent} from './home/home.component';

@Component({
  selector: 'app-root',
  imports: [SynthComponent, HomeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  @ViewChild(SynthComponent) synthComponent!: ElementRef<SynthComponent>
  @ViewChild(HomeComponent) homeComponent!: ElementRef<HomeComponent>;

  fileName: WritableSignal<string>;

  constructor() {
    this.fileName = signal<string>("");
  }

  ngAfterViewInit(): void {
  }
 }
