import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {LevelControl} from './level-control/level-control';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LevelControl],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('synthesiser');
}
