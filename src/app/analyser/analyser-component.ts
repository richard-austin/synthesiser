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
  source!: MediaStreamAudioSourceNode;
  canvasCtx!: CanvasRenderingContext2D | null;
  canvasEL!: HTMLCanvasElement;
  isPlaying: boolean = false;

  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('start_button') startButton!: ElementRef<HTMLButtonElement>;
  @ViewChild('stop_button') stopButton!: ElementRef<HTMLButtonElement>;

  async start(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;

    this.analyser = this.audioCtx.createAnalyser();

    this.analyser.fftSize = 2048;

    this.data = new Uint8Array(this.analyser.frequencyBinCount);

//    const stream = await navigator.mediaDevices.getUserMedia({audio: true});

 //   this.source = this.audioCtx.createMediaStreamSource(stream);
  //  this.source.connect(this.analyser);
  }

  getAnalyzer(): AnalyserNode {
    return this.analyser;
  }

  private draw = ()=> {
    if (!this.isPlaying) return
    this.canvasEL = this.canvas.nativeElement;
    this.canvasCtx = this.canvasEL.getContext("2d");
    if (this.canvasCtx) {
      this.canvasCtx.clearRect(0, 0, this.canvasEL.width, this.canvasEL.height)

      // fill DATA with the current frequency data
      this.analyser.getByteFrequencyData(this.data)

      // iterate through each frequency
      for (let i = 0; i < this.data.length; i++) {
        // normalize the amplitude value
        const value = this.data[i] / 1024

        // get the height based on the amplitude value
        const y = this.canvasEL.height - this.canvasEL.height * value

        // draw white rectangles
        this.canvasCtx.fillStyle = `black`

        // fillRect(x, y, w, h); x value is represented by i
        this.canvasCtx.fillRect(i, y, 2, 8)
      }
    }

    // make a loop to continue drawing on the next frame
    requestAnimationFrame(this.draw)
  }

  /**
   * Play the audio from mic
   */
  async micOn() {
    this.isPlaying = true
    this.draw()
  }

  /**
   * Stop the audio from mic
   */
   micOff() {
    this.isPlaying = false
    this.canvasCtx?.clearRect(0, 0, this.canvasEL.width, this.canvasEL.height)
  }
  async ngAfterViewInit(): Promise<void> {
    const startBtn = this.startButton.nativeElement;
    const stopBtn = this.stopButton.nativeElement;

    // start button event listener
    startBtn.addEventListener("click", async e => {
      e.preventDefault();

      startBtn.disabled = true;
      stopBtn.disabled = false;

      await this.micOn();
    })


// stop button event listener
    stopBtn.addEventListener("click", e => {
      e.preventDefault();

      startBtn.disabled = false;
      stopBtn.disabled = true;

      this.micOff();
    });
  }
}
