export class OscillatorWithPhaseMod {
  public node!: AudioWorkletNode;
  public port!: MessagePort;
  public readonly context: AudioContext;
  private static readonly waveTableSize = 2048;
  private wasmBinary: ArrayBuffer;

  /* Added wasmBinary into constructor to maintain pure dependency injection */
  constructor(audioCtx: AudioContext, wasmBinary: ArrayBuffer) {
    this.context = audioCtx;
    this.wasmBinary = wasmBinary;
  }

  async start(): Promise<void> {
    function worklet() {
      /* @ts-ignore */
      registerProcessor('oscillator', class Processor extends AudioWorkletProcessor {
        static get parameterDescriptors() {
          return [
            { name: 'mod', defaultValue: 0, minValue: -Math.PI * 4, maxValue: Math.PI * 4, automationRate: "a-rate" },
            { name: 'frequency', defaultValue: 263, minValue: 0, maxValue: 3.4028235e37, automationRate: "a-rate" },
            { name: 'detune', defaultValue: 0, minValue: -400000, maxValue: 400000, automationRate: "a-rate" }
          ];
        }

        running: boolean = true;
        private wasmInstance!: WebAssembly.Instance;
        private wasmMemory!: WebAssembly.Memory;

        /* Linear memory pointers mapped out from WASM */
        private ptrIn!: number;
        private ptrOut!: number;
        private ptrFreq!: number;
        private ptrDetune!: number;

        constructor(options: any) {
          super();
          const binary = options.processorOptions.wasmBinary;
          const waveTableSize = options?.processorOptions?.waveTableSize;
          const startFx = options?.processorOptions?.startFx;

          /* Compile WASM synchronously inside the AudioWorklet scope */
          const module = new WebAssembly.Module(binary);
          this.wasmInstance = new WebAssembly.Instance(module, {
            wasi_snapshot_preview1: {
              fd_write: () => 0,
              proc_exit: (code: number) => {
                console.warn(`WASM explicitly called exit with code: ${code}`);
              },
              /* Add this handler to satisfy random generation requests */
              random_get: (bufPtr: number, bufLen: number) => {
                /* 1. Get a direct view of the WASM instance's memory buffer */
                const memory = this.wasmInstance.exports['memory'] as WebAssembly.Memory;
                const view = new Uint8Array(memory.buffer, bufPtr, bufLen);

                /* 2. Fill the requested slice with random bytes using available Math primitives */
                for (let i = 0; i < bufLen; i++) {
                  view[i] = Math.floor(Math.random() * 256);
                }
                return 0; /* Return success status code */
              }
            }
          });

          this.wasmMemory = this.wasmInstance.exports['memory'] as WebAssembly.Memory;

          /* Pull raw offset locations */
          this.ptrIn = (this.wasmInstance.exports['getInputBufferPtr'] as Function)();
          this.ptrOut = (this.wasmInstance.exports['getOutputBufferPtr'] as Function)();
          this.ptrFreq = (this.wasmInstance.exports['getFreqBufferPtr'] as Function)();
          this.ptrDetune = (this.wasmInstance.exports['getDetuneBufferPtr'] as Function)();

          /* @ts-ignore */
          (this.wasmInstance.exports.initProcessor as Function)(sampleRate, startFx, waveTableSize);
          /* @ts-ignore */
          (this.wasmInstance.exports.calculateCoefficients as Function)(1000);

          /* @ts-ignore */
          this.port.onmessage = (event) => {
            if (event.data.type === 'shutdown') {
              this.running = false;
              /* @ts-ignore */
              this.port.close();
              console.log("Phase modulator closed");
            } else if (event.data.type === 'periodicWave') {
              const bands: Float32Array[] = event.data.periodicWave;
              (this.wasmInstance.exports['setUsePeriodicWave'] as Function)(true);

              /* Push multi-band wavetable chunks across the memory boundary */
              bands.forEach((bandData, bandIdx) => {
                for (let i = 0; i < bandData.length; i++) {
                  (this.wasmInstance.exports['setWaveTableBand'] as Function)(bandIdx, i, bandData[i]);
                }
              });
            } else if (event.data.type === 'type') {
              if (event.data.payload === "sine") {
                (this.wasmInstance.exports['setUsePeriodicWave'] as Function)(false);
              } else if (event.data.payload === "custom") {
                (this.wasmInstance.exports['setUsePeriodicWave'] as Function)(true);
              }
            }
          };
        }

        process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: { mod: number[], frequency: number[], detune: number[] }): boolean {
          const output = outputs[0];
          if (!output || !this.running) return true;

          const outputChannel = output[0];
          const blockSize = outputChannel.length;

          const modParam = parameters.mod;
          const frequencyParam = parameters.frequency;
          const detuneParam = parameters.detune;

          /* Wrap memory slice with typed float views */
          const memoryFloatView = new Float32Array(this.wasmMemory.buffer);

          /* Write Parameter Data down to WASM Linear Space */
          const inView = memoryFloatView.subarray(this.ptrIn / 4, this.ptrIn / 4 + blockSize);
          if (modParam.length === 1) {
            inView[0] = modParam[0];
          } else {
            inView.set(modParam);
          }

          const freqView = memoryFloatView.subarray(this.ptrFreq / 4, this.ptrFreq / 4 + blockSize);
          if (frequencyParam.length === 1) {
            freqView[0] = frequencyParam[0];
          } else {
            freqView.set(frequencyParam);
          }

          const detuneView = memoryFloatView.subarray(this.ptrDetune / 4, this.ptrDetune / 4 + blockSize);
          if (detuneParam.length === 1) {
            detuneView[0] = detuneParam[0];
          } else {
            detuneView.set(detuneParam);
          }

          /* Execute computation loop natively inside assembly instance */
          (this.wasmInstance.exports['processBlock'] as Function)(
            modParam.length,
            frequencyParam.length,
            detuneParam.length,
            blockSize
          );

          /* Read out modified data directly into output channel slice */
          const outView = memoryFloatView.subarray(this.ptrOut / 4, this.ptrOut / 4 + blockSize);
          outputChannel.set(outView);

          return this.running;
        }
      });
    }

    await this.context.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);

    this.node = new AudioWorkletNode(this.context, 'oscillator', {
      channelCount: 1,
      channelInterpretation: 'speakers',
      processorOptions: {
        waveTableSize: OscillatorWithPhaseMod.waveTableSize,
        startFx: OscillatorWithPhaseMod.startFx,
        wasmBinary: this.wasmBinary /* Sent safely over context construction options */
      }
    });
    this.port = this.node.port;
  }

  get modInput(): AudioParam { return this.node.parameters.get("mod") as AudioParam; }
  get frequency(): AudioParam { return this.node?.parameters.get("frequency") as AudioParam; }
  get detune(): AudioParam { return this.node.parameters.get("detune") as AudioParam; }

  savedType: OscillatorType = "sine";
  set type(type: OscillatorType) {
    this.savedType = type;
    this.port.postMessage({ type: 'type', payload: type });
  }
  get type(): OscillatorType { return this.savedType; }

  static lastReal: number[];
  static lastImag: number[];
  static lastTable: Promise<AudioBuffer[]>;
  static readonly startFx = 20;

  public static createPeriodicWave(audioCtx: AudioContext, real: number[], imag: number[], constraints: { disableNormalization: boolean } = { disableNormalization: false }): Promise<AudioBuffer[]> {
    if (real === this.lastReal && imag === this.lastImag) return this.lastTable;
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
      aba.forEach(ab => { cd.push(ab.getChannelData(0)); });
      this.port.postMessage({ type: 'periodicWave', periodicWave: cd });
    });
  }

  public disconnect(node?: AudioNode) { node ? this.node?.disconnect(node) : this.node.disconnect(); }
  public connect(node: AudioNode) { this.node.connect(node); }
  public destroy() {
    this.port.postMessage({ type: 'shutdown' });
    this.disconnect();
    /* @ts-ignore */
    this.node = this.port = undefined;
  }
}
