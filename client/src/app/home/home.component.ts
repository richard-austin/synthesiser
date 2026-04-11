import {
  AfterViewInit, ChangeDetectorRef,
  Component, effect, EffectRef,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild, WritableSignal
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RestfulApiService} from '../services/restful-api.service';
import {GeneralComponent} from '../general/general.component';
import {SortPipePipe} from '../sort-pipe-pipe';

@Component({
  selector: 'app-options',
  imports: [
    FormsModule,
    SortPipePipe
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() filename!: WritableSignal<string>;
  @Input() homeComponentControl!: WritableSignal<boolean>;

  @Input() disappearOnMouseOut!: boolean;

  @ViewChild('html') html!: ElementRef<HTMLDivElement>;
  @ViewChild('configOptions') configOptions!: ElementRef<HTMLSelectElement>;

  protected selectedConfig: string = "";
  protected configFileList: string[] = [];
  protected _confirmDelete: boolean = false;
  protected _confirmRename: boolean = false;
  protected newName: string = "";
  protected readonly configFileNameRegex = GeneralComponent._configFileNameRegex;
  protected successMessage: string = "";
  protected errorMessage: string = "";
  private homeControlEffectRef: EffectRef;
  private outerDiv!: HTMLDivElement;
  constructor(private cdr: ChangeDetectorRef, private rest: RestfulApiService) {

    this.homeControlEffectRef = effect(() => {
      const visible = this.homeComponentControl();
      const display = visible ? 'block' : 'none';
      this.outerDiv?.setAttribute('style', 'display:'+display);
    });
  }

  private reset() {
    this.rest.getConfigFileList().subscribe({
      next: (v) => {
        this.configFileList = v
        this.selectedConfig = '';
      },
      error: (e) => this.errorMessage = e,
      complete: () => {
        this._confirmDelete = false;
        if (this.configOptions && this.configOptions.nativeElement)
          this.configOptions.nativeElement.value = '';
        this.cdr.detectChanges();
      }
    });
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
      next: (v: any) => {
        this.successMessage = v.message;
      },
      complete: () => {
        this.reset();
        this.cancel();
      },
      error: (e: any) => {
        this.errorMessage = e.error.message;
        this.reset();
        this.cancel();
      }
    })
  }

  protected cancel() {
    this._confirmRename = this._confirmDelete = false;
    const selector = this.configOptions.nativeElement;
    selector.value = '';
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
      next: (v: any) => {
        this.successMessage = v.message;
      },
      complete: () => {
        this.reset();
        this.cancel();
      },
      error: (e) => {
        this.errorMessage = e.error.message;
        this.reset();
        this.cancel();
      },
    });
  }

  protected applySettingsFromFile(fileName: string) {
    this.rest.getSettings(fileName).subscribe({
      next: (v) => {
      },
      error: (e) => console.log(e),
      complete: () => {
        console.log("complete: settings loaded");
        this.filename.set(fileName);
        this.homeComponentControl.set(false);
      }
    });
  }

  ngOnInit() {
    this.reset();
  }

  ngAfterViewInit(): void {
    this.outerDiv = this.html.nativeElement;
    this.outerDiv.setAttribute('style', 'display:none');
  }

  ngOnDestroy(): void {
    const configOptions = this.configOptions.nativeElement;
    configOptions.onchange = null;
    this.homeControlEffectRef.destroy();
  }
}
