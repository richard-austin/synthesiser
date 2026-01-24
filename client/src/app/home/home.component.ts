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
import {GeneralComponent} from '../general/general.component';

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
  @ViewChild('configOptions') configOptions!: ElementRef<HTMLSelectElement>;
  @ViewChild('polyBtn') polyBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('monoBtn') monoBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('loadSelectedConfigBtn') loadSelectedConfigBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('deleteSelectedConfigBtn') deleteSelectedConfigBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('renameSelectedConfigBtn') renameSelectedConfigBtn!: ElementRef<HTMLButtonElement>;

  protected selectedConfig: string = "";
  protected configFileList: string[] = [];
  protected _confirmDelete: boolean = false;
  protected _confirmRename: boolean = false;
  protected newName: string = "";
  protected readonly configFileNameRegex =GeneralComponent._configFileNameRegex;

  constructor(private cdr: ChangeDetectorRef, private rest: RestfulApiService, private router: Router) {
  }

  synthTypeChange($event: Event) {
    // @ts-ignore
    const value = $event.target.value;
    this.synthType(value);
  }


  private reset() {
    this.rest.getConfigFileList().subscribe({
      next: (v) => {
        this.configFileList = v
        this.selectedConfig = '';
        },
      error: (e) => console.log(e),
      complete: () => {
        this._confirmDelete = false;
        this.cdr.detectChanges();
      }
    });
  }

  private configOptionChange(ev: Event) {
    const polyBtn = this.polyBtn.nativeElement;
    const monoBtn = this.monoBtn.nativeElement;
    const confirmSelectedConfigBtn = this.loadSelectedConfigBtn.nativeElement;
    const deleteSelectedConfigBtn = this.deleteSelectedConfigBtn.nativeElement;
    const renameSelectedConfigBtn = this.renameSelectedConfigBtn.nativeElement;

    // @ts-ignore
    if (ev?.target.value !== "") {
      polyBtn.disabled = monoBtn.disabled = true;
      confirmSelectedConfigBtn.disabled = false;
      deleteSelectedConfigBtn.disabled = false;
      renameSelectedConfigBtn.disabled = false;
    } else {
      polyBtn.disabled = monoBtn.disabled = false;
      confirmSelectedConfigBtn.disabled = true;
      deleteSelectedConfigBtn.disabled = true;
      renameSelectedConfigBtn.disabled = true;
    }
  }

  protected loadSelectedConfig() {
    const fileName = this.fileName();
    this.applySettingsFromFile(fileName);
  }

  protected confirmDelete() {
    this._confirmDelete = true;
  }


  protected confirmRename() {
    this._confirmRename = true;
    const selector = this.configOptions.nativeElement;
    selector.disabled = true;
  }

  protected commitRename() {
      this.rest.renameConfigFile(this.fileName(), this.newName).subscribe({
        next: (v:any) => {},
        complete: () => {
          this.reset();
        },
        error: (e:any) => {
          console.log(e);
          this.reset();
        }
      })
  }

  protected cancel() {
    this._confirmRename = this._confirmDelete = false;
    const selector = this.configOptions.nativeElement;
    selector.disabled = false;
  }

  protected fileName() {
    const configOptions = this.configOptions.nativeElement;
    // @ts-ignore
    const fileNameElem = configOptions[configOptions.value];
    return fileNameElem.textContent;
  }

  protected delete() {
    const fileName = this.fileName();
    this.rest.deleteConfig(fileName).subscribe({
      next: () => {
      },
      complete: () => {
        this.reset();
      },
      error: (e) => {
        console.error(e.message);
        this.reset();
      },
    });
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
        if (settings.numberOfOscillators === 1)
          this.router.navigate(['synth', 'mono', fileName]).then();
        else if (settings.numberOfOscillators > 1)
          this.router.navigate(['synth', 'poly', fileName]).then();
      }
    });
  }

  ngOnInit() {
    this.reset();
  }

  ngAfterViewInit(): void {
    const configOptions = this.configOptions.nativeElement;
    configOptions.onchange = ev => this.configOptionChange(ev);
    const confirmSelectedConfigBtn = this.loadSelectedConfigBtn.nativeElement;
    const deleteSelectedConfigBtn = this.deleteSelectedConfigBtn.nativeElement;
    const renameSelectedConfigBtn = this.renameSelectedConfigBtn.nativeElement;
    deleteSelectedConfigBtn.disabled =  renameSelectedConfigBtn.disabled = confirmSelectedConfigBtn.disabled = true;
  }

  ngOnDestroy(): void {
    const configOptions = this.configOptions.nativeElement;
    configOptions.onchange = null;
  }
}
