import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RestfulApiService} from '../services/restful-api.service';

@Component({
  selector: 'app-options',
  imports: [
    FormsModule
  ],
  templateUrl: './options-component.html',
  styleUrl: './options-component.scss',
})
export class OptionsComponent implements AfterViewInit, OnDestroy {
  @Input() disappearOnMouseOut!: boolean;

  @Output() synthType: EventEmitter<string> = new EventEmitter();
  @Output() selectedFile: EventEmitter<string> = new EventEmitter();

  @ViewChild('html') html!: ElementRef<HTMLDivElement>;
  @ViewChild('configOptions') configOptions!: ElementRef<HTMLFormElement>;
  @ViewChild('polyBtn') polyBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('monoBtn') monoBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('confirmSelectedConfigBtn') confirmSelectedConfigBtn!: ElementRef<HTMLButtonElement>;

  protected selectedConfig: string = "";
  protected configFileList: string[] = [];

  constructor(private rest: RestfulApiService) {
  }

   synthTypeChange($event: Event) {
    // @ts-ignore
    const value = $event.target.value;
    this.synthType.emit(value);
  }


  private getConfigFileList() {
    this.rest.getConfigFileList().subscribe({
      next: (v) => this.configFileList = v,
      error: (e) => console.log(e),
      complete: () => console.log("complete")
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
    this.selectedFile.emit(fileName);
  }

  ngAfterViewInit(): void {
   const configOptions = this.configOptions.nativeElement;
   configOptions.onchange = ev => this.configOptionChange(ev);
    const confirmSelectedConfigBtn = this.confirmSelectedConfigBtn.nativeElement;
    confirmSelectedConfigBtn.disabled = true;
    this.getConfigFileList();
  }

  ngOnDestroy(): void {
    const configOptions = this.configOptions.nativeElement;
    configOptions.onchange = null;
  }
}
