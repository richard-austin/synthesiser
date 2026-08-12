import {oscModType} from '../../enums/enums';

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
    this.savedTypes = Array(numberOfBanks).fill("sine");
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
        private readonly twoPi = Math.PI * 2;
        public detune: number = 0;
        public lastDetune: number = 1;
        public detuneFactor: number = 1;
        public tuning: number = 0; /* Initialise with 0 for normal tuning */
        public readonly envelope: Envelope = new Envelope();
        public type: OscillatorType = "sine";
        public periodicWave!: Float32Array[];
        currentPeriodicWave!: Float32Array[];
        private readonly waveTableSize: number;

        public periodicWaveFunction(x: number, band: number): number {
          return this.currentPeriodicWave[band][Math.floor(x * this.waveTableSize)];
        }

        public sineFunction(x: number): number {
          return Math.sin(x * this.twoPi);
        }

        public render: (x: number, band: number) => number = this.sineFunction;

        constructor(waveTableSize: number) {
          this.waveTableSize = waveTableSize;
        }
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
        public butterworthFilter: ButterworthFilter = new ButterworthFilter()
        ;

        public advanceEnvelopeToSustain(env: Envelope) {
          const {velocity} = this;
          const vel = velocity / 0x7f;

          if (this.keyDown) {
            if (!env.legato) {
              if (this.envelopePhase === envelopePhase.inactive || this.envelopePhase === envelopePhase.attack || this.envelopePhase === envelopePhase.retrigger) {
                this.inUse = true;
                if (this.envelopePhase === envelopePhase.inactive)
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
          const lowestSustainLevel = 0.1;  // Prevents indefinite release timeouts
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
                if (this.envelopePhase === envelopePhase.sustain) {
                  if (--this.legatoCountDown <= 0) {
                    this.envelopePhase = envelopePhase.release;
                    /* @ts-ignore */
                    this.releaseRate = (this.envelopeLevel + lowestSustainLevel) / (sampleRate * env.release);
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

      /* Have to redefine this here as the global one is not visible in a worklet */
      enum oscModType {amplitude = 'amplitude', frequency = 'frequency', off = 'off'}

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

      class ModSettings {
        public carrierIdx: number = 0;
        public level: number = 0;
        public modType: oscModType = oscModType.off;
      }

      class Modulator {
        modSettings: ModSettings[] = [];
        carriers: Carrier[];

        constructor(numberOfBanks: number, carriers: Carrier[]) {
          this.modSettings = Array.from({length: numberOfBanks}, () => new ModSettings());
          this.carriers = carriers;
        }

        setModType(carrierIdx: number, modType: oscModType) {
          const s = this.modSettings[carrierIdx];
          s.modType = modType;
          s.carrierIdx = carrierIdx;
          const c = this.carriers[carrierIdx];
          c.amAccumulators.fill(0);
          c.fmAccumulators.fill(0);
        }

        setModLevel(carrierIdx: number, level: number) {
          this.modSettings[carrierIdx].level = level;
        }

        input(osc: number, signal: number) {
          this.modSettings.forEach(s => {
            switch (s.modType) {
              case oscModType.off:
                break;
              case oscModType.frequency:
                this.carriers[s.carrierIdx].fmAccumulators[osc] += signal * s.level;
                break;
              case oscModType.amplitude:
                this.carriers[s.carrierIdx].amAccumulators[osc] += signal * s.level;
                break;
              default:
                console.error("Unknown mod type ", s.modType);
                break;
            }
          })
        }
      }

      class Carrier {
        public fmAccumulators: number[];
        public amAccumulators: number[];

        constructor(oscillatorsPerBank: number) {
          // this.hasAm = this.hasFm = false;
          this.amAccumulators = Array.from({length: oscillatorsPerBank}, () => 0);
          this.fmAccumulators = Array.from({length: oscillatorsPerBank}, () => 0);
        }
      }

      class ModulationMatrix {
        modulators: Modulator[];
        carriers: Carrier[];

        constructor(numberOfBanks: number, oscillatorsPerBank: number) {
          this.carriers = Array.from({length: numberOfBanks}, () => new Carrier(oscillatorsPerBank));
          this.modulators = Array.from({length: numberOfBanks}, () => new Modulator(numberOfBanks, this.carriers));
        }

        setModType(modIdx: number, carrierIdx: number, modType: oscModType) {
          this.modulators[modIdx].setModType(carrierIdx, modType);
        }

        setModLevel(modIdx: number, carrierIdx: number, level: number) {
          this.modulators[modIdx].setModLevel(carrierIdx, level);
        }

        input(modIdx: number, osc: number, signal: number) {
          this.modulators[modIdx].input(osc, signal);
        }

        output(carrierIdx: number, osc: number, modType: oscModType) {
          const carrier: Carrier = this.carriers[carrierIdx];

          switch (modType) {
            case oscModType.off:
              break;
            case oscModType.frequency:
              return carrier.fmAccumulators[osc];
            case oscModType.amplitude:
              return carrier.amAccumulators[osc];
            default:
              console.error("Unknown mod type ", modType);
          }
          return 0;
        }
      }

      /* @ts-ignore */
      registerProcessor('oscillator', class Processor extends AudioWorkletProcessor {
        running: boolean = true;
        private readonly waveTableSize = -1;
        private readonly startFx: number;
        private readonly numberOfBanks: number;
        private readonly oscillatorsPerBank: number;
        private readonly bankData: BankData[];
        private readonly oscData: OscillatorData[][];
        private readonly modMatrix: ModulationMatrix;
        private readonly expBase: number;
        private readonly inverseDenominator: number;

        constructor(options: any) {
          super();
          this.waveTableSize = options?.processorOptions?.waveTableSize;
          this.startFx = options?.processorOptions?.startFx;
          this.numberOfBanks = options?.processorOptions?.numberOfBanks;
          this.oscillatorsPerBank = options?.processorOptions?.oscillatorsPerBank;
          this.bankData = Array.from({length: this.numberOfBanks}, () => new BankData(this.waveTableSize));
          this.oscData = Array.from({length: this.numberOfBanks}, () => Array.from({length: this.oscillatorsPerBank}, () => new OscillatorData()));
          this.oscData.forEach(o => {
            o.forEach(osc => {
              /* @ts-ignore */
              osc.butterworthFilter.calculateCoefficients(1000, sampleRate);
            })
          });
          this.modMatrix = new ModulationMatrix(this.numberOfBanks, this.oscillatorsPerBank);

          this.process = this.process.bind(this); //
          /* Parameters for exponential amplitude envelope */
          // Your curve intensity factor (Try values between 2.0 and 5.0)
          const b = 2.0;

          // Pre-calculate the base and the scaling denominator
          this.expBase = Math.exp(b);
          this.inverseDenominator = 1.0 / (this.expBase - 1.0);

          //Array(this.numberOfBanks).fill(new OscillatorStatus()).map(() => Array(this.oscillatorsPerBank).fill(new OscillatorStatus()))
          /* @ts-ignore */
          this.port.onmessage = (event) => {
            if (event.data.type === 'shutdown') {
              this.running = false;
              /* @ts-ignore */
              this.port.close();
              console.log("Phase modulator closed");
            } else if (event.data.type === 'periodicWave') {
              const bd = this.bankData[event.data.bank];
              bd.periodicWave = event.data.periodicWave;
              bd.type = "custom";
              bd.render = bd.periodicWaveFunction;
            } else if (event.data.type === 'type') {
              const bd = this.bankData[event.data.bank];
              bd.type = event.data.payload;
              if (bd.type === "sine") {
                bd.render = bd.sineFunction;
              } else if (bd.type === "custom") {
                bd.render = bd.periodicWaveFunction;
              }
            } else if (event.data.type === 'keyDown') {
              this.keyDown(event.data.key, event.data.velocity);
            } else if (event.data.type === 'keyUp') {
              this.keyUp(event.data.key);
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
            } else if (event.data.type === 'setModType') {
              this.modMatrix.setModType(event.data.modBank, event.data.carrierBank, event.data.modType);
            } else if (event.data.type === 'setModLevel') {
              this.modMatrix.setModLevel(event.data.modBank, event.data.carrierBank, event.data.modLevel);
            }
          }
        }

        private readonly twelfthRoot2 = Math.pow(2, 1 / 12);
        private readonly root2 = Math.pow(2, 1 / 2);

        totalTime: number = 0
        iterationCount = 0;
        maxTime = 0;
        minTime = 100;

        process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
          const {expBase, inverseDenominator, bankData, oscData} = this;
          const output: Float32Array[] = outputs[0]
          const start = Date.now();
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
                bd.currentPeriodicWave = bd.periodicWave;  /* Update the periodic wave on a k-rate basis */

              for (let osc = 0; osc < this.oscillatorsPerBank; osc++) {
                const od = oscData[b][osc];
                // if (!od.inUse)
                //   continue;

                let f = od.frequency;

                if (f > nyquist)
                  f = nyquist;

                let band = 0;
                if (bd.render === bd.periodicWaveFunction) {
                  band = Math.floor(Math.log2(f / this.startFx) / Math.log2(this.root2));

                  if (band < 0) band = 0;
                  else if (band > bd.currentPeriodicWave.length - 1) band = bd.currentPeriodicWave.length - 1;
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

                const x = this.modMatrix.output(b, osc, oscModType.frequency);
                const mod = od.butterworthFilter.process(x);
                /* @ts-ignore */
                const inc = f / sampleRate;
                let phase = od.phase;
                phase += inc
                let currentPhase = phase + mod;
                currentPhase = currentPhase - Math.floor(currentPhase);
                od.phase = phase - Math.floor(phase);

                const ampEnvelope = (Math.pow(expBase, od.envelopeLevel) - 1.0) * inverseDenominator;
                const signal = bd.render(currentPhase, band);
                this.modMatrix.input(b, osc, signal);
                outputChannel[i] += ampEnvelope * signal;
              }
            }
          }

          const time = (Date.now() - start);
          this.totalTime += time
          this.iterationCount++;
          if (time > this.maxTime)
            this.maxTime = time;
          if (time < this.minTime)
            this.minTime = time;
          // Send an average performance report every 500 blocks (~1.5 seconds)
           if (this.iterationCount >= 500) {
             const averageMsPerBlock = this.totalTime / this.iterationCount;
             console.log("averageMsPerBlock = " + averageMsPerBlock + " maxTime = " + this.maxTime + " minTime = "+ this.minTime);
             //this.port.postMessage({ type: 'perf-report', averageMsPerBlock });

             this.totalTime = 0;
             this.iterationCount = 0;
             this.maxTime = 0;
             this.minTime = 100;
           }

          return this.running;
        }

        public keyDown(key: number, velocity: number) {
          const i = this.getVacantOscillator(key);
          if (i !== -1) {
            this.oscData.forEach((osc, bank) => {  /* forEach bank */
              const od = osc[i];
              od.frequency = this.keyToFrequency(key, bank);
              od.key = key;
              od.keyDown = true;
              od.inUse = true;
              od.velocity = velocity;
              if (od.envelopePhase !== envelopePhase.retrigger)
                od.phase = 0;  /* Start from zero to prevent clicks */
            });
            /* @ts-ignore */
            this.port.postMessage({type: "keyDown", oscillator: i, key: key, velocity: velocity});
          }
        }

        public keyUp(key: number) {
          this.oscData.forEach(osc => {
            const i = osc.findIndex(s => s.inUse && s.key === key);
            if (i !== -1) {
              const oc = osc[i];
              oc.keyDown = false;
              /* @ts-ignore */
              this.port.postMessage({type: "keyUp", oscillator: i, key: key});
            }
          })

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

        private roundRobinIndex = 0;

        private getVacantOscillator(key: number): number {
          let i: number = -1;
          /* See if the key is still in an active envelope */
          let od = this.oscData.find(s => s.findIndex(o => o.inUse && o.key === key) !== -1);
          if (od) {
            i = od.findIndex(o => o.inUse && o.key === key);
            const bd = this.bankData;
            bd.forEach((b, bankIndex) => {
              const env = b.envelope;
              this.oscData[bankIndex][i].envelopePhase = envelopePhase.retrigger;
              // @ts-ignore
              env.retriggerRate = 1 / (sampleRate * (env.attack + 4 / od[bankIndex].frequency)); /* Padded with 1/f to prevent clicks on retriggers with very short attack times */
            });
          } else {  /* Otherwise get the least recently  used oscillator */
            i = this.roundRobinIndex++;

            if (this.roundRobinIndex >= this.oscillatorsPerBank)
              this.roundRobinIndex = 0;
          }
          this.oscData.forEach((osc, bankIndex) => { /* forEach bank */
            const od = osc[i];
            const bd = this.bankData[bankIndex];
            const env = bd.envelope;
            /* @ts-ignore */
            env.decayRate = 1 / (sampleRate * (env.decay + 4 / od.frequency));/* Padded with 1/f to prevent clicks on very short decay times */
            /* @ts-ignore */
            od.releaseRate = 1 / (sampleRate * (env.release + 4 / od.frequency));  /* Padded with 1/f to prevent clicks on very short release times */
          });
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

  savedTypes: OscillatorType[] = [];

  setType(type: OscillatorType, bank: number) {
    this.savedTypes[bank] = type;
    this.port.postMessage({type: 'type', payload: type, bank: bank});
  }

  getType(bank: number): OscillatorType {
    return this.savedTypes[bank];
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

  public setModType(modBank: number, carrierBank: number, modType: oscModType) {
    this.port?.postMessage({type: "setModType", modBank: modBank, carrierBank: carrierBank, modType: modType});
  }

  public setModLevel(modBank: number, carrierBank: number, modLevel: number) {
    this.port?.postMessage({type: "setModLevel", modBank: modBank, carrierBank: carrierBank, modLevel: modLevel});
  }

  clearModulation() {
    for (let modBank = 0; modBank < this.numberOfBanks; modBank++) {
      for (let carrierBank = 0; carrierBank < this.numberOfBanks; carrierBank++) {
        this.setModLevel(modBank, carrierBank, 0);
        this.setModType(modBank, carrierBank, oscModType.off);
      }
    }
  }

  public keyDown(key: number, velocity: number) {
    this.port?.postMessage({type: 'keyDown', key: key, velocity: velocity});
  }

  public keyUp(key: number) {
    this.port?.postMessage({type: 'keyUp', key: key});
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
