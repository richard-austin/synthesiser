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
  homeComponentControl: WritableSignal<boolean>;

  constructor() {
    this.fileName = signal<string>("");
    this.homeComponentControl = signal<boolean>(false);
  }
  protected async showHomeForm() {
    // Toggle home component
    this.homeComponentControl.set(!this.homeComponentControl());
  }

  ngAfterViewInit(): void {
  }
 }
