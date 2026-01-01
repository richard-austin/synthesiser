import {AfterViewInit, Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit{

  constructor() {
  }

  ngAfterViewInit(): void {
  }

  protected poly() {
    window.location.href = 'synth/poly';
  }
  protected mono() {
    window.location.href = 'synth/mono';
  }
}
