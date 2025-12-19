import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';

@Component({
  selector: 'app-analyser',
  imports: [],
  templateUrl: './analyser-component.html',
  styleUrl: './analyser-component.scss',
})
export class AnalyserComponent implements AfterViewInit {
  audioCtx!: AudioContext;
  analyser!: AnalyserNode;
  data!: Uint8Array<ArrayBuffer>;
  canvasCtx!: CanvasRenderingContext2D | null;
  canvasEL!: HTMLCanvasElement;
  isPlaying: boolean = false;

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  async start(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;

    this.analyser = this.audioCtx.createAnalyser();

    this.analyser.fftSize = 2048;

    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.isPlaying = true;
    this.draw();
//    const stream = await navigator.mediaDevices.getUserMedia({audio: true});

 //   this.source = this.audioCtx.createMediaStreamSource(stream);
  //  this.source.connect(this.analyser);
  }
  private draw = ()=> {
    if (!this.isPlaying) return
    this.canvasEL = this.canvas.nativeElement;
    this.canvasCtx = this.canvasEL.getContext("2d");
    if (this.canvasCtx) {
      this.canvasCtx.fillStyle = 'silver';
      this.canvasCtx.fillRect(0, 0, this.canvasEL.width, this.canvasEL.height)
      // fill DATA with the current frequency data
      this.analyser.getByteFrequencyData(this.data)

      // iterate through each frequency
      for (let i = 0; i < this.data.length; i++) {
        // normalize the amplitude value
        const value = this.data[i] / 300

        // get the height based on the amplitude value
        const y = this.canvasEL.height * value

        // draw red rectangles
        this.canvasCtx.fillStyle = `red`
        // fillRect(x, y, w, h); x value is represented by i
        this.canvasCtx.fillRect(Math.pow(i, 0.75)*7, this.canvasEL.height, 2, -y);
      }
    }

    // make a loop to continue drawing on the next frame
    requestAnimationFrame(this.draw)
  }

  async ngAfterViewInit(): Promise<void> {
  }
}
