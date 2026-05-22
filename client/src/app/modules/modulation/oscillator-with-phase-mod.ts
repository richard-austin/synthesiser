interface IDictionary {
  [index: string]: Float32Array;
}

export class OscillatorWithPhaseMod {
  public node!: AudioWorkletNode;
  public port!: MessagePort;
  audioCtx: AudioContext;

  constructor(audioCtx: AudioContext) {
    this.audioCtx = audioCtx;
  }

  async start(): Promise<void> {
    function worklet() {
      // @ts-ignore
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
            maxValue: 25000,
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
        readonly sampleRate: number;
        private readonly periodicWave: Float32Array;
        private type: OscillatorType = "sine";
        private readonly xToIndex: number;

        constructor(options: any) {
          super();
          console.log(options)
          this.sampleRate = options?.processorOptions?.sampleRate || 48000;
          this.xToIndex = this.sampleRate / 2;
          this.periodicWave = new Float32Array(this.sampleRate / 2);
          console.log(this.sampleRate);
          // @ts-ignore
          this.port.onmessage = (event) => {
            if (event.data.type === 'shutdown') {
              this.running = false;
              // @ts-ignore
              this.port.close();
              console.log("Phase modulator closed");
            } else if (event.data.type === 'periodicWave') {
              const periodicWave: Float32Array = event.data.periodicWave;
              periodicWave.forEach((term: number, i: number) => {
                this.periodicWave[i] = term;
              });
              this.type = "custom";
              this.render = this.periodicWaveFunction;
            } else if (event.data.type === 'type') {
              this.type = event.data.payload;
              if (this.type === "sine") {
                this.render = this.sineFunction;
              } else if (this.type === "square") {
                this.render = this.squareFunction;
              } else if (this.type === "sawtooth") {
                this.render = this.sawtoothFunction;
              } else if (this.type === "triangle") {
                this.render = this.triangleFunction;
              } else if (this.type === "custom") {
                this.render = this.periodicWaveFunction;
              }
            }
          }
        }

        private readonly twoPi = Math.PI * 2.0;

        private sineFunction(x: number): number {
          return Math.sin(x * this.twoPi);
        }

        private periodicWaveFunction(x: number): number {
          return this.periodicWave[Math.floor(x * this.xToIndex)];
        }

        private squareFunction = (x: number): number => {
          return x < 0.5 ? -1 : 1;
        }

        private sawtoothFunction(x: number) {
          return 2 * (0.5 - x);
        }

        private triangleFunction(x: number){
          return x < 0.5 ? 4 * x - 1 : 3 - 4 * x;
        }

        private render: (x: number) => number = this.sineFunction;

        private phase = 0;
        private lastDetune = 0;
        private detuneFactor = 1;
        private readonly twelthRoot2 = Math.pow(2, 1/12);
        process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: IDictionary) {
          const output: Float32Array[] = outputs[0];
          // const input: Float32Array[] = inputs[0];
          const modParam = parameters["mod"];
          const frequencyParam = parameters["frequency"];
          const detuneParam  = parameters["detune"];

          if (!output) return true;
          const outputChannel: Float32Array = output[0];
          for (let i = 0; i < outputChannel.length; i++) {
            let f = frequencyParam.length === 1 ? frequencyParam[0] : frequencyParam[i];
            const detune = detuneParam.length === 1 ? detuneParam[0] : detuneParam[i];
            if(detune !== this.lastDetune) {
              this.lastDetune = detune;
              this.detuneFactor = Math.pow(this.twelthRoot2, detune/100);
            }
            f *= this.detuneFactor;

            const mod = (modParam.length === 1 ? modParam[0] : modParam[i]) * 10;
            const inc = f / this.sampleRate;
            this.phase += inc
            let currentPhase = this.phase + mod;
            currentPhase = currentPhase - Math.floor(currentPhase);
            this.phase = this.phase - Math.floor(this.phase);

            outputChannel[i] = this.render(currentPhase);
          }
          return this.running;
        }
      });
    }

    await this.audioCtx.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
    // Create worklet node
    this.node = new AudioWorkletNode(this.audioCtx, 'oscillator', {
      channelCount: 1,
      channelInterpretation: 'speakers',
      processorOptions: {sampleRate: this.audioCtx.sampleRate}
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

  public createPeriodicWave(real: number[], imag: number[]): Float32Array {
    const retVal = new Float32Array(this.audioCtx.sampleRate / 2);
    if (real.length !== imag.length)
      throw Error("real and imaginary arrays must be the same length in createPeriodicWave");
    const phaseFactor = Math.PI * 2 / retVal.length;

    for (let i = 0; i < retVal.length; i++) {
      let term = 0;
      real.forEach((r, j) => {
        term += (r * Math.cos(i * j * phaseFactor) + imag[j] * Math.sin(i * j * phaseFactor));
      });
      retVal[i] = term;
    }

    return retVal;
  }

  setPeriodicWave(periodicWave: Float32Array) {
    this.port.postMessage({type: 'periodicWave', periodicWave: periodicWave});
  }

  public disconnect() {
    this.node?.disconnect();
  }

  public connect(node: AudioNode) {
    this.node.connect(node)
  }

  public destroy() {
    this.port.postMessage({type: 'shutdown'});
    this.disconnect();
    // @ts-ignore
    this.node = this.port = undefined;
  }
}
