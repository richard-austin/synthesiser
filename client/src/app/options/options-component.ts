import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild} from '@angular/core';

@Component({
  selector: 'app-options',
  imports: [],
  templateUrl: './options-component.html',
  styleUrl: './options-component.scss',
})
export class OptionsComponent implements AfterViewInit, OnDestroy {
  @Input() disappearOnMouseOut!: boolean;

  @Output() synthType: EventEmitter<string> = new EventEmitter();
  @ViewChild('html') html!: ElementRef<HTMLDivElement>;
  @ViewChild('synthOptions') synthOptions!: ElementRef<HTMLFormElement>;

  protected onmouseenter() {
    const html = this.html.nativeElement;
    html.style.transition = "opacity 0.5s ease-in";
    html.style.opacity = "1";
  }

  protected onmouseleave() {
    if(this.disappearOnMouseOut) {
      const html = this.html.nativeElement;
      html.style.transition = "opacity 0.5s ease-out";
      html.style.opacity = "0";
    }
  }

  optionChange($event: Event) {
    // @ts-ignore
    const value = $event.target.value;
    this.onmouseleave();
    this.synthType.emit(value);
  }

  ngAfterViewInit(): void {
    const synthOptions = this.synthOptions.nativeElement;
    synthOptions.onchange = ev => this.optionChange(ev);
  }

  ngOnDestroy(): void {
    const synthOptions = this.synthOptions.nativeElement;
    synthOptions.onchange = null;
  }
}
