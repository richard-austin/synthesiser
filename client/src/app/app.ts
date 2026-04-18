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
  @ViewChild(HomeComponent) homeComponent!: HomeComponent;

  started = false;

  fileName: WritableSignal<string>;
  homeComponentControl: WritableSignal<boolean>;

  constructor() {
    this.fileName = signal<string>("");
    this.homeComponentControl = signal<boolean>(false);
  }
  protected async showHomeForm() {
    if(this.started) {
      this.homeComponent.ngOnInit(); // Ensure file list is reloaded
      // Toggle home component
      this.homeComponentControl.set(!this.homeComponentControl());
    } else
      this.started = true;
  }

  ngAfterViewInit(): void {
  }
 }
