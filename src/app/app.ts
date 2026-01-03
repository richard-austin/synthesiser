import {AfterViewInit, Component} from '@angular/core';
import {Router, RouterOutlet} from '@angular/router';
import {OptionsComponent} from './options/options-component';
import {timer} from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OptionsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  protected removeOptionsOnMouseOut: boolean = false;
  constructor(private router: Router) {
  }

  ngAfterViewInit(): void {
  }

  // protected poly() {
  //   window.location.href = 'synth/poly';
  // }
  //
  // protected mono() {
  //   window.location.href = 'synth/mono';
  // }

  protected synthType($event: string) {
    this.removeOptionsOnMouseOut = true;
    this.router.navigate(['/']).then();
    const sub = timer(100).subscribe(() => {
      sub.unsubscribe();
      if ($event === 'mono')
        this.router.navigate(['synth', 'mono']).then();
      else if ($event === 'poly')
        this.router.navigate(['synth', 'poly']).then();
   });
  }
}
