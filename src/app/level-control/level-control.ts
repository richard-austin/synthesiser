import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';

@Component({
  selector: 'app-level-control',
  imports: [],
  templateUrl: './level-control.html',
  styleUrl: './level-control.scss',
})
export class LevelControl implements AfterViewInit {
  drawOperationsWorker!: Worker;

  @ViewChild('theCanvas') theCanvas!: ElementRef<HTMLCanvasElement>;

  startRender() {
      this.drawOperationsWorker = new Worker(new URL('./draw-operations.worker', import.meta.url));
      this.drawOperationsWorker.onmessage = async  ({data}) => {

    };
      const offScreenCanvas = this.theCanvas.nativeElement.transferControlToOffscreen();

      this.drawOperationsWorker.postMessage({canvas: offScreenCanvas}, [offScreenCanvas]);
  }

  ngAfterViewInit(): void {
    this.startRender();
  }
}
