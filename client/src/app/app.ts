import {AfterViewInit, Component} from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {SynthSettings} from './settings/synth-settings';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  settings!: SynthSettings;
  constructor(private router: Router) {
  }

  ngAfterViewInit(): void {
    this.router.navigate(["/home"]).then();
  }
 }
