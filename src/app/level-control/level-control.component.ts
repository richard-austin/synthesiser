import {AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {dialStyle, LevelControlParameters} from './levelControlParameters';

@Component({
  selector: 'app-level-control',
  imports: [],
  templateUrl: './level-control.component.html',
  styleUrl: './level-control.component.scss',
})
export class LevelControlComponent implements AfterViewInit {
  drawOperationsWorker!: Worker;
  params!: LevelControlParameters;
  readonly extraForCursor = 26;
  @ViewChild('theCanvas') canvas!: ElementRef<HTMLCanvasElement>;
  @Output() setLevel = new EventEmitter<number>();
  @Input() radius: number = 50;
  @Input() calAngle: number = 330;
  @Input() divisions: number = 10;
  @Input() label: string = '???';
  @Input() plusMinus: boolean = false;
  @Input() style: dialStyle = dialStyle.blue

  startRender() {
    this.drawOperationsWorker = new Worker(new URL('./draw-operations.worker', import.meta.url));
    this.drawOperationsWorker.onmessage = async ({data}) => {
      if (data === "terminate") {
        //this.drawOperationsWorker.terminate();
      }
    };
    const offScreenCanvas = this.canvas.nativeElement.transferControlToOffscreen();

    this.params = new LevelControlParameters(offScreenCanvas, this.radius, this.calAngle, this.divisions, this.label, this.plusMinus, this.style, this.radius, this.radius + this.extraForCursor);
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

  setAngle(currentAngle: number, delta: number): number {
    currentAngle += delta;
    const p = this.params;
    const upperLimit = p.plusMinus ? p.calAngle/2 : p.calAngle;
    const lowerLimit = p.plusMinus ? -p.calAngle/2 :0;
    if (currentAngle > upperLimit)
      currentAngle = upperLimit;
    else if (currentAngle < lowerLimit)
      currentAngle = lowerLimit;
    this.setLevel.emit(currentAngle / p.calAngle);

    this.drawOperationsWorker.postMessage({angle: currentAngle});
    return currentAngle;
  }

  currentAngle = 0;

  setValue(value: number) {
    let p = this.params;
    this.currentAngle = this.setAngle(p.calAngle * value / p.divisions, 0);
  }

  ngAfterViewInit(): void {
    this.startRender();
    const canvas = this.canvas.nativeElement;
    let mouseDown = false;
    let lastX = 0
    let lastY = 0;
    canvas.tabIndex = 0;
    canvas.addEventListener('mousedown', (e) => {
      let p = this.params;
      let x = e.offsetX - p.centreX;
      let y = e.offsetY - p.centreY;
      mouseDown = true;
      canvas.focus();
      if (x >= -this.params.radius && x <= this.params.radius &&
        y >= -this.params.radius && y <= this.params.radius) {
        lastX = x;
        lastY = y;
      }
      e.preventDefault();
    });

    canvas.addEventListener('mousemove', (e) => {
      let p = this.params;
      let x = e.offsetX - p.centreX;
      let y = e.offsetY - p.centreY;
      let deltaAngle = 0;
      if (mouseDown && x >= -this.params.radius && x <= this.params.radius &&
        y >= -this.params.radius && y <= this.params.radius) {

        const delta = ((y - lastY) * Math.sign(x) - (x - lastX) * Math.sign(y)) / Math.sqrt(x ** 2 + y ** 2) / 3;
        deltaAngle = 2.5 * Math.asin(delta) * 180 / Math.PI;
        lastX = x;
        lastY = y;
        if (isNaN(deltaAngle))
          console.log("deltaAngle = " + deltaAngle);
        if (!isNaN(deltaAngle) && deltaAngle !== 0)
          this.currentAngle = this.setAngle(this.currentAngle, deltaAngle);
      }
      e.preventDefault();
    });

    canvas.addEventListener('mouseup', (e) => {
      lastX = lastY = 0;
      mouseDown = false;
      e.preventDefault();
    });

    canvas.addEventListener('mouseout', (e) => {
      lastX = lastY = 0;
      mouseDown = false;
      e.preventDefault();
    });

    canvas.addEventListener('keydown', (e) => {
      let delta = 0.5;
      if (/^Escape|F1|F2|F3|F4|F5|F6|F7|F8|F9|F10|F11|F12$/.test(e.key)) {
        let p = this.params;
        const key = e.key === "Escape" ? "F0" : e.key;
        const sign = e.shiftKey ? -1 : 1;
        this.currentAngle = this.setAngle(p.calAngle * sign * parseInt(key.substring(1)) / p.divisions, 0);
      }
      else if (e.ctrlKey)
        delta = 4;
      else if (e.shiftKey)
        delta = 1;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (e.key === "ArrowDown")
          delta *= -1;
        this.currentAngle = this.setAngle(this.currentAngle, delta);
      }
      e.preventDefault();
    });
  }
}
