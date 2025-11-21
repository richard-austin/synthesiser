import {AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild} from '@angular/core';
import {LevelControlParameters} from './levelControlParameters';

@Component({
  selector: 'app-level-control',
  imports: [],
  templateUrl: './level-control.html',
  styleUrl: './level-control.scss',
})
export class LevelControl implements AfterViewInit {
  drawOperationsWorker!: Worker;
  params!: LevelControlParameters;

  @ViewChild('theCanvas') theCanvas!: ElementRef<HTMLCanvasElement>;
  @Output() setLevel = new EventEmitter<number>();

  startRender() {
    this.drawOperationsWorker = new Worker(new URL('./draw-operations.worker', import.meta.url));
    this.drawOperationsWorker.onmessage = async ({data}) => {
      if (data === "terminate") {
        //  this.drawOperationsWorker.terminate();
      }
    };
    const offScreenCanvas = this.theCanvas.nativeElement.transferControlToOffscreen();

    this.params = new LevelControlParameters(offScreenCanvas, 50, 330, 10);
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
    if (currentAngle > this.params.calAngle)
      currentAngle = this.params.calAngle;
    else if (currentAngle < 0)
      currentAngle = 0;
    this.setLevel.emit(currentAngle / this.params.calAngle);
    this.drawOperationsWorker.postMessage({angle: currentAngle});
    return currentAngle;
  }

  ngAfterViewInit(): void {
    this.startRender();
    const canvas = this.theCanvas.nativeElement;
    let mouseDown = false;
    let currentAngle = 0;
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
      let delta = 0;
      if (mouseDown && x >= -this.params.radius && x <= this.params.radius &&
        y >= -this.params.radius && y <= this.params.radius) {

        delta = (y - lastY) * Math.sign(x) - (x - lastX) * Math.sign(y);
        lastX = x;
        lastY = y;

        currentAngle = this.setAngle(currentAngle, delta);
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
      //console.log("key", e);
      let delta = 0.5;
      if (e.ctrlKey)
        delta = 4;
      else if (e.shiftKey)
        delta = 1;
      if(/^[0123456789]$/.test(e.key)) {
        let p = this.params;

        currentAngle = this.setAngle(p.calAngle * parseInt(e.key) / 10, 0);
      }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();

        if (e.key === "ArrowDown")
          delta *= -1;
         currentAngle = this.setAngle(currentAngle, delta);
      }
    });
  }
}
