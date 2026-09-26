import {
  AfterViewInit, ChangeDetectorRef,
  Component, effect, EffectRef,
  ElementRef, inject,
  input,
  OnDestroy,
  OnInit,
  viewChild
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RestfulApiService} from '../services/restful-api.service';
import {GeneralComponent} from '../general/general.component';
import {SortPipePipe} from '../sort-pipe-pipe';
import {SignalService} from '../services/signal-service';
import {timer} from 'rxjs';

@Component({
  selector: 'app-config-file',
  imports: [
    FormsModule,
    SortPipePipe
  ],
  templateUrl: './config-file.component.html',
  styleUrl: './config-file.component.scss',
})
export class ConfigFileComponent implements OnInit, AfterViewInit, OnDestroy {
  signalService: SignalService = inject(SignalService);

  disappearOnMouseOut = input<boolean>(false);

  html = viewChild.required<ElementRef<HTMLDivElement>>('html');
  configOptions = viewChild.required<ElementRef<HTMLSelectElement>>('configOptions');
  loadButton = viewChild.required<ElementRef<HTMLButtonElement>>('loadButton');
  renameButton = viewChild.required<ElementRef<HTMLButtonElement>>('renameButton');
  deleteButton = viewChild.required<ElementRef<HTMLButtonElement>>('deleteButton');

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
      const visible = this.signalService.configFileComponentControl();
      this.loadButton().nativeElement.disabled = this.deleteButton().nativeElement.disabled = this.renameButton().nativeElement.disabled = true;
      const display = visible ? 'block' : 'none';
      this.outerDiv?.setAttribute('style', 'display:'+display);
    });
  }

  private reset() {
    this.rest.getConfigFileList().subscribe({
      next: (v) => {
        this.configFileList = v
        const selector = this.configOptions().nativeElement;
        selector.value = '';
      },
      error: (e) => this.errorMessage = e,
      complete: () => {
        this._confirmDelete = false;
        if (this.configOptions() && this.configOptions().nativeElement)
          this.configOptions().nativeElement.value = '';
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
    this.newName = "";
    const selector = this.configOptions().nativeElement;
    selector.disabled = true;
  }

  protected commitRename() {
    const fileName = this.fileName();
    this.rest.renameConfigFile(fileName, this.newName).subscribe({
      next: (v: any) => {
        this.successMessage = v.message;
      },
      complete: () => {
        this.reset();
        this.cancel();
        this.signalService.rename.set({oldName: fileName, newName: this.newName});
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
    const selector = this.configOptions().nativeElement;
    selector.value = '';
    selector.disabled = false;

    this.loadButton().nativeElement.disabled = true;
    this.deleteButton().nativeElement.disabled = true;
    this.renameButton().nativeElement.disabled = true;
  }


  protected cancelEditOp() {

    this._confirmDelete = this._confirmRename = false;

    const sub = timer(1000).subscribe(() =>{
      this.signalService.configFileComponentControl.set(false);
      this.cdr.detectChanges();
      sub.unsubscribe();
    });
  }

  protected fileName() {
    return this.configOptions().nativeElement.value;
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
        this.signalService.fileName.set("");  // To ensure reload if filename not changed
        this.signalService.fileName.set(fileName);
        this.signalService.configFileComponentControl.set(false);
      }
    });
  }

  ngOnInit() {
    this.reset();
  }

  ngAfterViewInit(): void {
    const loadButton = this.loadButton().nativeElement;
    const deleteButton = this.deleteButton().nativeElement;
    const renameButton = this.renameButton().nativeElement;

    loadButton.disabled = true;
    deleteButton.disabled = true;
    renameButton.disabled = true;

    this.outerDiv = this.html().nativeElement;
    this.outerDiv.setAttribute('style', 'display:none');
    this.configOptions().nativeElement.addEventListener("change", (e) => {
      const disabled = this.configOptions().nativeElement.value === '';
      loadButton.disabled = disabled;
      deleteButton.disabled = disabled;
      renameButton.disabled = disabled;
     });
  }

  ngOnDestroy(): void {
    const configOptions = this.configOptions().nativeElement;
    configOptions.onchange = null;
    this.homeControlEffectRef.destroy();
  }
}
