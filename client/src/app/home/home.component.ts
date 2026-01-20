import {
  AfterViewInit, ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RestfulApiService} from '../services/restful-api.service';
import {timer} from 'rxjs';
import {SynthSettings} from '../settings/synth-settings';
import {Router} from '@angular/router';

@Component({
  selector: 'app-options',
  imports: [
    FormsModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() disappearOnMouseOut!: boolean;

  @ViewChild('html') html!: ElementRef<HTMLDivElement>;
  @ViewChild('configOptions') configOptions!: ElementRef<HTMLFormElement>;
  @ViewChild('polyBtn') polyBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('monoBtn') monoBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('confirmSelectedConfigBtn') confirmSelectedConfigBtn!: ElementRef<HTMLButtonElement>;

  protected selectedConfig: string = "";
  protected configFileList: string[] = [];

  constructor(private cdr: ChangeDetectorRef, private rest: RestfulApiService, private router: Router) {
  }

   synthTypeChange($event: Event) {
    // @ts-ignore
    const value = $event.target.value;
    this.synthType(value);
  }


  private getConfigFileList() {
    this.rest.getConfigFileList().subscribe({
      next: (v) => this.configFileList = v,
      error: (e) => console.log(e),
      complete: () => {
        console.log("complete");
        this.cdr.detectChanges();
      }
    });
  }

  private configOptionChange(ev: Event) {
    const polyBtn = this.polyBtn.nativeElement;
    const monoBtn = this.monoBtn.nativeElement;
    const confirmSelectedConfigBtn = this.confirmSelectedConfigBtn.nativeElement;
    // @ts-ignore
    if(ev?.target.value !== "") {
      polyBtn.disabled = monoBtn.disabled = true;
      confirmSelectedConfigBtn.disabled = false;
    } else {
      polyBtn.disabled = monoBtn.disabled = false;
      confirmSelectedConfigBtn.disabled = true;
    }
  }

  protected confirmSelectedConfig() {
    const configOptions = this.configOptions.nativeElement;
    const fileNameElem = configOptions[configOptions["value"]];
    const fileName = fileNameElem.textContent;
    this.applySettingsFromFile(fileName);
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
    let settings: SynthSettings;
    this.rest.getSettings(fileName).subscribe({
      next: (v) => settings = v,
      error: (e) => console.log(e),
      complete: () => {
        console.log("complete: settings loaded");
        if(settings.numberOfOscillators === 1)
          this.router.navigate(['synth', 'mono', fileName]).then();
        else if (settings.numberOfOscillators > 1)
          this.router.navigate(['synth', 'poly', fileName]).then();
      }
    });
  }

  ngOnInit() {
    this.getConfigFileList();
  }

  ngAfterViewInit(): void {
   const configOptions = this.configOptions.nativeElement;
   configOptions.onchange = ev => this.configOptionChange(ev);
    const confirmSelectedConfigBtn = this.confirmSelectedConfigBtn.nativeElement;
    confirmSelectedConfigBtn.disabled = true;
  }

  ngOnDestroy(): void {
    const configOptions = this.configOptions.nativeElement;
    configOptions.onchange = null;
  }
}
