import {AfterViewInit, Component} from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {OptionsComponent} from './options/options-component';
import {timer} from 'rxjs';
import {RestfulApiService} from './services/restful-api.service';
import {SynthSettings} from './settings/synth-settings';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OptionsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  settings!: SynthSettings;
  constructor(private router: Router, private rest: RestfulApiService) {
  }

  protected synthType($event: string) {
    const sub = timer(100).subscribe(() => {
      sub.unsubscribe();
      if ($event === 'mono')
        this.router.navigate(['synth', 'mono']).then();
      else if ($event === 'poly')
        this.router.navigate(['synth', 'poly']).then();
    });
  }

  protected applySettingsFromFile(fileName: string) {
    this.rest.getSettings(fileName).subscribe({
      next: (v) => this.settings = v,
      error: (e) => console.log(e),
      complete: () => {
        console.log("complete: settings loaded");
        if(this.settings.numberOfOscillators === 1)
          this.router.navigate(['synth', 'mono', fileName]).then();
        else if (this.settings.numberOfOscillators > 1)
          this.router.navigate(['synth', 'poly', fileName]).then();
      }
    });
  }

  ngAfterViewInit(): void {
  }

 }
