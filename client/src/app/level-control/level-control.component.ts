import {AfterViewInit, Component, ElementRef, OnDestroy, viewChild, output, input} from '@angular/core';
import {dialStyle, LevelControlParameters} from './levelControlParameters';

@Component({
  selector: 'app-level-control',
  imports: [],
  templateUrl: './level-control.component.html',
  styleUrl: './level-control.component.scss',
  standalone: true
})
export class LevelControlComponent implements AfterViewInit, OnDestroy {
  drawOperationsWorker!: Worker;
  params!: LevelControlParameters;
  readonly extraForCursor = 26;
  readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('theCanvas');
  readonly setLevel = output<number>();
  readonly radius = input<number>(50);
  readonly calAngle = input<number>(330);
  readonly divisions = input<number>(10);
  readonly factor = input<number>(1);
  readonly label = input<string>('???');
  readonly plusMinus = input<boolean>(false);
  readonly style = input<dialStyle>(dialStyle.blue);

  startRender() {
    this.drawOperationsWorker = new Worker(new URL('./draw-operations.worker', import.meta.url));
    this.drawOperationsWorker.onmessage = async ({data}) => {
      if (data === "terminate") {
        this.drawOperationsWorker.terminate();
      }
    };
    const offScreenCanvas = this.canvas().nativeElement.transferControlToOffscreen();

    this.params = new LevelControlParameters(offScreenCanvas, this.radius(), this.calAngle(), this.divisions(), this.label(), this.plusMinus(), this.style(), this.radius(), this.radius() + this.extraForCursor);
    this.drawOperationsWorker.postMessage({
      canvas: this.params.canvas,
      params: this.params.getObject()
    }, [this.params.canvas]);
  }

  focus() {
    this.drawOperationsWorker.postMessage("focus");
  }

  blur() {
    this.drawOperationsWorker.postMessage("blur");
  }

  setAngle(angle: number): number {
    const p = this.params;
    const upperLimit = p.plusMinus ? p.calAngle / 2 : p.calAngle;
    const lowerLimit = p.plusMinus ? -p.calAngle / 2 : 0;
    if (angle > upperLimit)
      angle = upperLimit;
    else if (angle < lowerLimit)
      angle = lowerLimit;
    this.setLevel.emit(this.factor() * angle / p.calAngle);

    this.drawOperationsWorker.postMessage({angle: angle});
    return angle;
  }

  currentAngle = 0;

  setValue(value: number) {
    let p = this.params;
    this.currentAngle = this.setAngle(p.calAngle * value / this.factor());
  }

  changeStyle(style: dialStyle) {
    this.params.style = style;
    this.drawOperationsWorker.postMessage({angle: this.currentAngle, style: style});
  }

  ngAfterViewInit(): void {
    this.startRender();
    const canvas = this.canvas().nativeElement;
    let mouseDown = false;
    let lastY = 0;
    canvas.tabIndex = 0;
    canvas.addEventListener('mousedown', (e) => {
      let y = e.screenY;
      mouseDown = true;
      canvas.focus();
      lastY = y;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (mouseDown) {
        let y = e.screenY;
        let deltaAngle;
        const delta = lastY - y;
        deltaAngle = 1.2 *delta;
        lastY = y;
        this.currentAngle = this.setAngle(this.currentAngle + deltaAngle);
        e.preventDefault();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (mouseDown) {
        mouseDown = false;
        e.preventDefault();
      }
    });

    canvas.addEventListener('keydown', (e) => {
      let delta = 0.5;
      if (/^Escape|F1|F2|F3|F4|F5|F6|F7|F8|F9|F10|F11|F12$/.test(e.key)) {
        let p = this.params;
        const key = e.key === "Escape" ? "F0" : e.key;
        const sign = e.shiftKey ? -1 : 1;
        this.currentAngle = this.setAngle(p.calAngle * sign * parseInt(key.substring(1)) / p.divisions);
      } else if (e.ctrlKey)
        delta = 4;
      else if (e.shiftKey)
        delta = 1;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (e.key === "ArrowDown")
          delta *= -1;
        this.currentAngle = this.setAngle(this.currentAngle + delta);
      }
      e.preventDefault();
    });
  }

  ngOnDestroy(): void {
    this.drawOperationsWorker.terminate();
  }
}
