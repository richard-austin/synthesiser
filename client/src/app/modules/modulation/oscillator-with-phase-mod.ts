export class OscillatorWithPhaseMod {
  public node!: AudioWorkletNode;
  public port!: MessagePort;
  public readonly context: AudioContext;
  private static readonly waveTableSize = 2048;

  constructor(audioCtx: AudioContext) {
    this.context = audioCtx;
  }

  async start(): Promise<void> {
    function worklet() {

      class ButterworthFilter {
        private x1: number;
        private x2: number;
        private y1: number;
        private y2: number;
        private b0: number;
        private b1: number;
        private b2: number;
        private a1: number;
        private a2: number;

        constructor() {
          /* Two pole butterworth filter on the mod input to help prevent aliasing
           Initialize biquad state variables (x: inputs, y: outputs)
          */
          this.x1 = 0;
          this.x2 = 0;
          this.y1 = 0;
          this.y2 = 0;

          /* Cache the previous cutoff to prevent unnecessary recalculations */
          this.b0 = 0;
          this.b1 = 0;
          this.b2 = 0;
          this.a1 = 0;
          this.a2 = 0;
        }

        calculateCoefficients(cutoff: number, sampleRate: number) {
          /* Bilinear Transform Pre-warping */
          const omega = Math.PI * cutoff / sampleRate;
          const tanVal = Math.tan(omega);

          /* 2nd-order Butterworth prototype parameters */
          const sqrt2 = Math.SQRT2; /* $\sqrt{2} \approx 1.4142$ */

          const c2 = tanVal * tanVal;
          const a0 = 1 + sqrt2 * tanVal + c2;

          /* Direct Form II Transposed coefficients */
          this.b0 = c2 / a0;
          this.b1 = 2 * c2 / a0;
          this.b2 = c2 / a0;
          this.a1 = 2 * (c2 - 1) / a0;
          this.a2 = (1 - sqrt2 * tanVal + c2) / a0;
        }

        process(input: number): number {
          /* Biquad Difference Equation (Direct Form I) */
          const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;

          /* Shift delay taps */
          this.x2 = this.x1;
          this.x1 = input;
          this.y2 = this.y1;
          this.y1 = output;

          return output;
        }
      }


      /* @ts-ignore */
      registerProcessor('oscillator', class Processor extends AudioWorkletProcessor {
        static get parameterDescriptors() {
          return [{
            name: 'mod',
            defaultValue: 0,
            minValue: -Math.PI * 4,
            maxValue: Math.PI * 4,
            automationRate: "a-rate"
          },
            {
              name: 'frequency',
              defaultValue: 263,
              minValue: 0,
              maxValue: 3.4028235e37,
              automationRate: "a-rate"
            },
            {
              name: 'detune',
              defaultValue: 0,
              minValue: -400000,
              maxValue: 400000,
              automationRate: "a-rate"
            }];
        }

        running: boolean = true;
        private periodicWave!: Float32Array[];
        private type: OscillatorType = "sine";
        private readonly waveTableSize = -1;
        private readonly startFx: number;
        private readonly modFilter: ButterworthFilter;
        private readonly nyquist: number;

        constructor(options: any) {
          super();
          this.waveTableSize = options?.processorOptions?.waveTableSize;
          this.startFx = options?.processorOptions?.startFx;
          /* @ts-ignore */
          this.nyquist = sampleRate / 2;
          /* @ts-ignore */
          this.port.onmessage = (event) => {
            if (event.data.type === 'shutdown') {
              this.running = false;
              /* @ts-ignore */
              this.port.close();
              console.log("Phase modulator closed");
            } else if (event.data.type === 'periodicWave') {
              this.periodicWave = event.data.periodicWave;
              this.type = "custom";
              this.render = this.periodicWaveFunction;
            } else if (event.data.type === 'type') {
              this.type = event.data.payload;
              if (this.type === "sine") {
                this.render = this.sineFunction;
              } else if (this.type === "custom") {
                this.render = this.periodicWaveFunction;
              }
            }
          }

          this.modFilter = new ButterworthFilter();
          /* @ts-ignore */
          this.modFilter.calculateCoefficients(1000, sampleRate);
        }

        private readonly twoPi = Math.PI * 2.0;

        private sineFunction(x: number): number {
          return Math.sin(x * this.twoPi);
        }

        currentPeriodicWave!: Float32Array[];

/*        lastBand = -1; */
        private periodicWaveFunction(x: number, band: number): number {
          /* if(band != this.lastBand) {
             this.lastBand = band;
             console.log("band = "+band);
           } */
          return this.currentPeriodicWave[band][Math.floor(x * this.waveTableSize)];
        }

        private render: (x: number, band: number) => number = this.sineFunction;

        private phase = 0;
        private lastDetune = 0;
        private detuneFactor = 1;
        private readonly twelfthRoot2 = Math.pow(2, 1 / 12);
        private readonly root2 = Math.pow(2, 1 / 2);

        process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: {mod: number[], frequency: number[], detune: number[]}): boolean {
          const output: Float32Array[] = outputs[0];

          const modParam = parameters.mod;
          const frequencyParam = parameters.frequency;
          const detuneParam = parameters.detune;
          const nyquist = this.nyquist;
          if (this.periodicWave)
            this.currentPeriodicWave = this.periodicWave;  /* Update the periodic wave on a k-rate basis */

          if (!output) return true;
          const outputChannel: Float32Array = output[0];
          for (let i = 0; i < outputChannel.length; i++) {

            let f = frequencyParam.length === 1 ? frequencyParam[0] : frequencyParam[i];

            if(f > nyquist)
              f = nyquist;

            let band = 0;
            if (this.render === this.periodicWaveFunction) {
              band = Math.floor(Math.log2(f / this.startFx) / Math.log2(this.root2));

              if (band < 0) band = 0;
              else if (band > this.currentPeriodicWave.length - 1) band = this.currentPeriodicWave.length - 1;
            }
            const detune = detuneParam.length === 1 ? detuneParam[0] : detuneParam[i];
            if (detune !== this.lastDetune) {
              this.lastDetune = detune;
              this.detuneFactor = Math.pow(this.twelfthRoot2, detune / 100);
            }
            f *= this.detuneFactor;

            const x = (modParam.length === 1 ? modParam[0] : modParam[i] * 10);
            const mod = this.modFilter.process(x);
            /* @ts-ignore */
            const inc = f / sampleRate;
            this.phase += inc
            let currentPhase = this.phase + mod;
            currentPhase = currentPhase - Math.floor(currentPhase);
            this.phase = this.phase - Math.floor(this.phase);

            outputChannel[i] = this.render(currentPhase, band);
          }
          return this.running;
        }
      });
    }

    await this.context.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
    // Create worklet node
    this.node = new AudioWorkletNode(this.context, 'oscillator', {
      channelCount: 1,
      channelInterpretation: 'speakers',
      processorOptions: {
        waveTableSize: OscillatorWithPhaseMod.waveTableSize,
        startFx: OscillatorWithPhaseMod.startFx
      }
    });
    this.port = this.node.port;
  }

  get modInput(): AudioParam {
    return this.node.parameters.get("mod") as AudioParam;
  }

  get frequency(): AudioParam {
    return this.node?.parameters.get("frequency") as AudioParam;
  }

  get detune(): AudioParam {
    return this.node.parameters.get("detune") as AudioParam;
  }

  savedType: OscillatorType = "sine";

  set type(type: OscillatorType) {
    this.savedType = type;
    this.port.postMessage({type: 'type', payload: type});
  }

  get type(): OscillatorType {
    return this.savedType;
  }

  static lastReal: number[];
  static lastImag: number[];
  static lastTable: Promise<AudioBuffer[]>;
  static readonly startFx = 20;

  public static createPeriodicWave(audioCtx: AudioContext, real: number[], imag: number[], constraints: {
    disableNormalization: boolean
  } = {disableNormalization: false}): Promise<AudioBuffer[]> {
    if(real === this.lastReal && imag === this.lastImag)
      return this.lastTable;

    this.lastReal = real;
    this.lastImag = imag;
    const refFreq = audioCtx.sampleRate / OscillatorWithPhaseMod.waveTableSize;
    const sampleRate = audioCtx.sampleRate;
    const retVal = [];
    const root2 = Math.pow(2, 1 / 2);
    for (let fx = this.startFx; fx < sampleRate / 2; fx *= root2) {
      const olac = new OfflineAudioContext(1, OscillatorWithPhaseMod.waveTableSize, sampleRate);
      const o = olac.createOscillator();
      const numberOfTerms = Math.floor(sampleRate / 2 / fx) + 1;
      o.setPeriodicWave(olac.createPeriodicWave(real.slice(0, numberOfTerms), imag.slice(0, numberOfTerms), constraints));
      o.frequency.value = refFreq;
      o.connect(olac.destination);
      o.start();
      retVal.push(olac.startRendering());
    }
    return this.lastTable = Promise.all(retVal);
  }

  setPeriodicWave(periodicWaves: Promise<AudioBuffer[]>) {
    periodicWaves.then(aba => {
      const cd: Float32Array[] = [];

      aba.forEach(ab => {
        cd.push(ab.getChannelData(0));
      });
      this.port.postMessage({type: 'periodicWave', periodicWave: cd});
    });
  }

  public disconnect(node?: AudioNode) {
    node ? this.node?.disconnect(node) : this.node.disconnect();
  }

  public connect(node: AudioNode) {
    this.node.connect(node)
  }

  public destroy() {
    this.port.postMessage({type: 'shutdown'});
    this.disconnect();
    /* @ts-ignore */
    this.node = this.port = undefined;
  }
}
