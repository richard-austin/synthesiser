export enum envelopePhase {inactive, attack, decay, sustain, release, retrigger, legato }

export class OscillatorArray {
  private readonly oscillatorsPerBank;
  private readonly numberOfBanks;

  public node!: AudioWorkletNode;
  public port!: MessagePort;
  public readonly context: AudioContext;
  private static readonly waveTableSize = 2048;

  constructor(audioCtx: AudioContext, numberOfBanks: number, oscillatorsPerBank: number) {
    this.context = audioCtx;
    this.numberOfBanks = numberOfBanks;
    this.oscillatorsPerBank = oscillatorsPerBank;
  }

  async start(): Promise<void> {
    function worklet() {
      class Envelope {
        public attack: number;
        public attackRate: number = 0;
        public retriggerRate: number = 0;
        public decay: number;
        public decayRate: number = 0;
        public sustainLevel: number;
        public release: number;
        public legato: boolean;

        constructor() {
          this.attack = 0;
          this.decay = 0.5;
          this.sustainLevel = 0.0;
          this.release = 0.5;
          this.legato = false;
          this.calculateRates();
        }

        public calculateRates(): void {
          /* @ts-ignore */
          const sr = sampleRate;
          this.attackRate = 1 / (sr * this.attack);
          this.decayRate = 1 / (sr * this.decay);
        }
      }

      enum envelopePhase {inactive, attack, decay, sustain, release, retrigger, legato }

      class BankData {
        public detune: number = 0;
        public lastDetune: number = 1;
        public detuneFactor: number = 1;
        public tuning: number = 0; /* Initialise with 0 for normal tuning */
        public readonly envelope: Envelope = new Envelope();
        public periodicWave!: Float32Array[];
      }

      class OscillatorData {
        public inUse: boolean = false;
        public key = -1;
        public keyDown: boolean = false;
        public envelopeLevel: number = 0;
        public envelopePhase: envelopePhase = envelopePhase.inactive;
        public velocity: number = 0x0f;
        public frequency: number = 1;
        public phase: number = 0;
        public releaseRate = 1;
        private legatoCountDown: number = 0;
        public advanceEnvelopeToSustain(env: Envelope) {
          const {velocity} = this;
          const vel = velocity / 0x7f;

          if (this.keyDown) {
            if (!env.legato) {
              if (this.envelopePhase === envelopePhase.inactive || this.envelopePhase === envelopePhase.attack || this.envelopePhase === envelopePhase.retrigger) {
                this.inUse = true;
                if(this.envelopePhase === envelopePhase.inactive)
                  this.envelopePhase = envelopePhase.attack;
                switch (this.envelopePhase) {
                  case envelopePhase.retrigger:
                    this.envelopeLevel += env.retriggerRate;
                    break;
                  default:
                    this.envelopeLevel += env.attackRate;
                    break
                }

                if (this.envelopeLevel >= vel) {
                  this.envelopePhase = envelopePhase.decay;
                  this.envelopeLevel = vel;
                }
              } else if (this.envelopePhase === envelopePhase.decay) {
                this.envelopeLevel -= env.decayRate;
                if (this.envelopeLevel <= env.sustainLevel * vel) {
                  this.envelopePhase = envelopePhase.sustain;
                  this.envelopeLevel = env.sustainLevel * vel;
                }
              }
            } else {
              if (this.envelopePhase === envelopePhase.inactive || this.envelopePhase === envelopePhase.sustain || this.envelopePhase === envelopePhase.retrigger) {
                /* @ts-ignore */
                this.legatoCountDown = sampleRate * (env.attack + env.decay);
                this.envelopePhase = envelopePhase.sustain;
                this.envelopeLevel = vel;
              }
            }
          }
        }

        public advanceEnvelopeToZero(env: Envelope) {
          const lowestSustainLevel =0.1;  // Prevents indefinite release timeouts
           if (!this.keyDown) {
            if (!env.legato) {
              if (this.envelopePhase !== envelopePhase.inactive) {
                if (this.envelopePhase !== envelopePhase.release) {

                  /* @ts-ignore */
                  this.releaseRate = 1 / (sampleRate * env.release);
                }
                this.envelopePhase = envelopePhase.release;
                this.envelopeLevel -= this.releaseRate;
                if (this.envelopeLevel <= 0) {
                  this.envelopePhase = envelopePhase.inactive;
                  this.envelopeLevel = 0;
                  this.inUse = false;
                }
              }
            } else {
              if (this.envelopePhase !== envelopePhase.inactive) {
                if(this.envelopePhase === envelopePhase.sustain) {
                  if (--this.legatoCountDown <= 0) {
                    this.envelopePhase = envelopePhase.release;
                    /* @ts-ignore */
                    this.releaseRate = (this.envelopeLevel+lowestSustainLevel) / (sampleRate * env.release);
                  }
                } else if (this.envelopePhase === envelopePhase.release) {
                  this.envelopeLevel -= this.releaseRate;
                  if (this.envelopeLevel <= 0) {
                    this.envelopeLevel = 0;
                    this.envelopePhase = envelopePhase.inactive;
                    this.inUse = false;
                  }
                }
              }
            }
          }
        }
      }

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
        running: boolean = true;
        private type: OscillatorType = "sine";
        private readonly waveTableSize = -1;
        private readonly startFx: number;
        private readonly modFilter: ButterworthFilter;
        private readonly numberOfBanks: number;
        private readonly oscillatorsPerBank: number;
        private readonly bankData: BankData[];
        private readonly oscData: OscillatorData[][];

        private readonly  expBase: number;
        private readonly inverseDenominator: number;

        private readonly twoPi: number;

        constructor(options: any) {
          super();
          this.waveTableSize = options?.processorOptions?.waveTableSize;
          this.startFx = options?.processorOptions?.startFx;
          this.numberOfBanks = options?.processorOptions?.numberOfBanks;
          this.oscillatorsPerBank = options?.processorOptions?.oscillatorsPerBank;
          this.bankData = Array.from({length: this.numberOfBanks}, () => new BankData());
          this.oscData = Array.from({length: this.numberOfBanks}, () => Array.from({length: this.oscillatorsPerBank}, () => new OscillatorData()));

          this.process = this.process.bind(this); //
          /* Parameters for exponential amplitude envelope */
          // Your curve intensity factor (Try values between 2.0 and 5.0)
          const b = 4.0;

          // Pre-calculate the base and the scaling denominator
          this.expBase = Math.exp(b);
          this.inverseDenominator = 1.0 / (this.expBase - 1.0);
          this.twoPi = 2 * Math.PI;


          //Array(this.numberOfBanks).fill(new OscillatorStatus()).map(() => Array(this.oscillatorsPerBank).fill(new OscillatorStatus()))
          /* @ts-ignore */
          this.port.onmessage = (event) => {
            if (event.data.type === 'shutdown') {
              this.running = false;
              /* @ts-ignore */
              this.port.close();
              console.log("Phase modulator closed");
            } else if (event.data.type === 'periodicWave') {
              this.bankData[event.data.bank].periodicWave = event.data.periodicWave;
              this.type = "custom";
              this.render = this.periodicWaveFunction;
            } else if (event.data.type === 'type') {
              this.type = event.data.payload;
              if (this.type === "sine") {
                this.render = this.sineFunction;
              } else if (this.type === "custom") {
                this.render = this.periodicWaveFunction;
              }
            } else if (event.data.type === 'keyDown') {
              this.keyDown(event.data.bank, event.data.key, event.data.velocity);
            } else if (event.data.type === 'keyUp') {
              this.keyUp(event.data.bank, event.data.key);
            } else if (event.data.type === 'tuning') {
              const bank = event.data.bank;
              const os = this.oscData[bank];
              const bankStatus = this.bankData[bank];
              bankStatus.tuning = event.data.tuning;
              os.forEach((o) => {
                o.frequency = this.keyToFrequency(o.key, bank);
              });
            } else if (event.data.type === 'detune') {
              const bank = event.data.bank;
              //  const os = this.oscillatorStatus[bank];
              const bankStatus = this.bankData[bank];
              bankStatus.detune = event.data.detune;
            } else if (event.data.type === 'envelope') {
              this.setEnvelope(event.data.bank, event.data.phase, event.data.value);
            }
          }

          this.modFilter = new ButterworthFilter();
          /* @ts-ignore */
          this.modFilter.calculateCoefficients(1000, sampleRate);
        }

        private sineFunction(x: number): number {
          return Math.sin(x * this.twoPi);
        }

        currentPeriodicWave!: Float32Array[];

        /*        lastBand = -1; */
        private periodicWaveFunction(x: number, band: number): number {
          return this.currentPeriodicWave[band][Math.floor(x * this.waveTableSize)];
        }

        private render: (x: number, band: number) => number = this.sineFunction;

        private readonly twelfthRoot2 = Math.pow(2, 1 / 12);
        private readonly root2 = Math.pow(2, 1 / 2);

        process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
          const { expBase, inverseDenominator, bankData,  oscData } = this;
          const output: Float32Array[] = outputs[0]

          /* @ts-ignore */
          const nyquist = sampleRate / 2;
          if (!output) return true;
          const op: Float32Array = output[0];
          for (let i = 0; i < op.length; ++i) {
            for (let bank = 0; bank < this.numberOfBanks; ++bank) {
              let op = outputs[bank][0]
              op[i] = 0;
            }
          }

          for (let i = 0; i < op.length; i++) {
            for (let b = 0; b < this.numberOfBanks; ++b) {
              const opb = outputs[b];
              const outputChannel: Float32Array = opb[0];
              const bd = bankData[b];
              const env = bd.envelope;
              if (bd.periodicWave && bd.periodicWave[b])
                this.currentPeriodicWave = bd.periodicWave;  /* Update the periodic wave on a k-rate basis */

              for (let osc = 0; osc < this.oscillatorsPerBank; osc++) {
                const od = oscData[b][osc];
                if (!od.inUse)
                  continue;

                let f = od.frequency;

                if (f > nyquist)
                  f = nyquist;

                let band = 0;
                if (this.render === this.periodicWaveFunction) {
                  band = Math.floor(Math.log2(f / this.startFx) / Math.log2(this.root2));

                  if (band < 0) band = 0;
                  else if (band > this.currentPeriodicWave.length - 1) band = this.currentPeriodicWave.length - 1;
                }
                const detune = bd.detune;
                if (detune !== bd.lastDetune) {
                  bd.lastDetune = detune;
                  bd.detuneFactor = Math.pow(this.twelfthRoot2, detune / 100);
                }

                if (od.keyDown) {
                  od.advanceEnvelopeToSustain(env);
                } else {
                  od.advanceEnvelopeToZero(env);
                }

                f *= bd.detuneFactor;
                const x = 0;// (modParam.length === 1 ? modParam[0] : modParam[i] * 10);
                const mod = this.modFilter.process(x);
                /* @ts-ignore */
                const inc = f / sampleRate;
                let phase = od.phase;
                phase += inc
                let currentPhase = phase + mod;
                currentPhase = currentPhase - Math.floor(currentPhase);
                od.phase = phase - Math.floor(phase);

                const ampEnvelope = (Math.pow(expBase, od.envelopeLevel) - 1.0) * inverseDenominator;
                outputChannel[i] += ampEnvelope * this.render(currentPhase, band);
              }
            }
          }
          return this.running;
        }

        public keyDown(bank: number, key: number, velocity: number) {
          const i = this.getVacantOscillator(bank, key);
          if (i !== -1) {
            const od = this.oscData[bank][i];
            od.frequency = this.keyToFrequency(key, bank);
            od.key = key;
            od.keyDown = true;
            od.inUse = true;
            od.velocity = velocity;
            if(od.envelopePhase !== envelopePhase.retrigger)
              od.phase = 0;  /* Start from zero to prevent clicks */
            /* @ts-ignore */
            this.port.postMessage({type: "keyDown", bank: bank, oscillator: i, key: key, velocity: velocity});
          }
        }

        public keyUp(bank: number, key: number) {
          const od: OscillatorData[] = this.oscData[bank];
          const i = od.findIndex(s => s.key === key);
          if (i !== -1) {
            const oc = this.oscData[bank][i];
            oc.keyDown = false;
            /* @ts-ignore */
            this.port.postMessage({type: "keyUp", bank: bank, oscillator: i, key: key});
          }
        }

        private setEnvelope(bank: number, phase: envelopePhase, value: number) {
          const env = this.bankData[bank].envelope;
          switch (phase) {
            case envelopePhase.attack:
              env.attack = value;
              break;
            case envelopePhase.decay:
              env.decay = value;
              break;
            case envelopePhase.sustain:
              env.sustainLevel = value;
              break;
            case envelopePhase.release:
              env.release = value;
              break;
            case envelopePhase.legato:
              env.legato = value > 0;
              break;
            default:
              break;
          }
          env.calculateRates();
        }

        private keyToFrequency(key: number, bank: number) {
          const frequencyFactor = 7.717057388; // To give middle C at 261.63 Hz on key 60
          return frequencyFactor * Math.pow(Math.pow(2, 1 / 12), (key + 1) + 120 * (this.bankData[bank].tuning * 6 / 10));
        }

        private getVacantOscillator(bank: number, key: number): number {
          const oscData: OscillatorData[] = this.oscData[bank];
          const bd = this.bankData[bank];
          const env = bd.envelope;

          let i = oscData.findIndex(s => s.inUse && (s.key === key));
          if (i === -1) {
            i = oscData.findIndex(s => !s.inUse);  // TODO: Need a fallback to use the least recently used oscillator if none available
          } else {
            const od = oscData[i];
            od.envelopePhase = envelopePhase.retrigger;
            /* @ts-ignore */
            env.retriggerRate = 1 / (sampleRate * (env.attack + 4/od.frequency)); /* Padded with 1/f to prevent clicks on retriggers with very short attack times */
          }
          const od = oscData[i];
          /* @ts-ignore */
          env.decayRate = 1 / (sampleRate * (env.decay + 4/od.frequency));/* Padded with 1/f to prevent clicks on very short decay times */
          /* @ts-ignore */
          od.releaseRate = 1 / (sampleRate * (env.release + 4/od.frequency));  /* Padded with 1/f to prevent clicks on very short release times */
          return i;
        }
      });
    }

    await this.context.audioWorklet.addModule(`data:text/javascript,(${worklet.toString()})()`);
    // Create worklet node
    this.node = new AudioWorkletNode(this.context, 'oscillator', {
      numberOfOutputs: this.numberOfBanks,
      outputChannelCount: [] = Array(this.numberOfBanks).fill(1),
      channelInterpretation: 'speakers',
      processorOptions: {
        numberOfBanks: this.numberOfBanks,
        oscillatorsPerBank: this.oscillatorsPerBank,
        waveTableSize: OscillatorArray.waveTableSize,
        startFx: OscillatorArray.startFx
      }
    });
    this.port = this.node.port;
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
    if (real === this.lastReal && imag === this.lastImag)
      return this.lastTable;

    this.lastReal = real;
    this.lastImag = imag;
    const refFreq = audioCtx.sampleRate / OscillatorArray.waveTableSize;
    const sampleRate = audioCtx.sampleRate;
    const retVal = [];
    const root2 = Math.pow(2, 1 / 2);
    for (let fx = this.startFx; fx < sampleRate / 2; fx *= root2) {
      const olac = new OfflineAudioContext(1, OscillatorArray.waveTableSize, sampleRate);
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

  setPeriodicWave(periodicWaves: Promise<AudioBuffer[]>, bank: number) {
    periodicWaves.then(aba => {
      const cd: Float32Array[] = [];

      aba.forEach(ab => {
        cd.push(ab.getChannelData(0));
      });
      this.port?.postMessage({type: 'periodicWave', periodicWave: cd, bank: bank});
    });
  }

  public disconnect(node?: AudioNode) {
    node ? this.node?.disconnect(node) : this.node.disconnect();
  }

  public tuning(tuning: number, bank: number) {
    this.port?.postMessage({type: 'tuning', tuning: tuning, bank: bank});
  }

  public detune(detune: number, bank: number) {
    this.port?.postMessage({type: 'detune', detune: detune, bank: bank});
  }

  public envelope(bank: number, phase: envelopePhase, value: number) {
    this.port?.postMessage({type: "envelope", bank: bank, phase: phase, value: value})
  }

  public keyDown(bank: number, key: number, velocity: number) {
    this.port?.postMessage({type: 'keyDown', bank: bank, key: key, velocity: velocity});
  }

  public keyUp(bank: number, key: number) {
    this.port?.postMessage({type: 'keyUp', bank: bank, key: key});
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
