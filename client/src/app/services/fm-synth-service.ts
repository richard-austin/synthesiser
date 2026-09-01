import {Injectable} from '@angular/core';
import {OscillatorSettings} from '../settings/oscillator';
import {filterModType, modWaveforms, oscModOutput, oscModType} from '../enums/enums';
import {envelopePhase, pitchEnvelopePhase} from '../oscillator/oscillator.component';
import {lastValueFrom, timer} from 'rxjs';
import {WaveTables} from '../modules/wavetables';

@Injectable({
  providedIn: 'root'
})
export class FmSynthService {
  private audioContext!: AudioContext;
  private synthNode!: AudioWorkletNode;
  private gainNodes: GainNode[] = [];
  private keyDownHandlers: ((bank: number, device: number, key: number, velocity: number) => void)[] = [];
  private keyUpHandlers: ((bank: number, device: number, key: number,) => void)[] = [];
  private port!: MessagePort;
  private _numberOfBanks!: number;
  private waveTableSize: number = 2048;
  private numberOfBands = 21;

  async initializeSynth(audioCtx: AudioContext, numberOfBanks: number = 4, oscillatorsPerBank: number = 12): Promise<void> {
    if (!this.audioContext) {
      this._numberOfBanks = numberOfBanks;
      // 1. Instantiate the AudioContext on the main thread
      this.audioContext = audioCtx;
      this.gainNodes = Array.from({length: numberOfBanks}, () => audioCtx.createGain());
      this.gainNodes.forEach(gainNode => {
        gainNode.gain.value = 1
      });
      await this.start(numberOfBanks, oscillatorsPerBank);
      this.synthNode.port.onmessage = (event: MessageEvent) => {
        switch (event.data.type) {
          case 'keyDown':
            this.keyDownHandlers.forEach(handler => handler(event.data.bank, event.data.device, event.data.key, event.data.velocity));
            break;
          case 'keyUp':
            this.keyUpHandlers.forEach(handler => handler(event.data.bank, event.data.device, event.data.key));
            break;
          default:
            console.error("Unknown event type " + event.data.type);
            break;
        }
      }

      this.gainNodes.forEach((gainNode, b) => {
        this.synthNode.connect(gainNode, b);
      })
    }
  }

  async start(numberOfBanks: number, oscillatorsPerBank: number): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // FIX: Explicitly monitor and guard against background context pausing
    this.audioContext.onstatechange = () => {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    };
    // 1. Load the standalone self-contained script file directly into the background scope
    await this.audioContext.audioWorklet.addModule('assets/wasm/engine-module.js');

    // 4. Create your AudioWorkletNode instance linking your custom 'oscillator' token
    this.synthNode = new AudioWorkletNode(this.audioContext, 'oscillator', {
      numberOfOutputs: numberOfBanks * 2, // 2 x numberOfBanks to accommodate separate filter outputs
      outputChannelCount: Array(numberOfBanks * 2).fill(1),
      channelInterpretation: 'speakers',
      processorOptions: {
        numberOfBanks: numberOfBanks,
        oscillatorsPerBank: oscillatorsPerBank,
        waveTableSize: this.waveTableSize,
        startFx: 20
      }
    });

    this.port = this.synthNode.port;

    await lastValueFrom(timer(500));
    // 5. Trigger the layout allocations inside your background C loop
    this.port.postMessage({
      type: 'init',
      numberOfBanks: numberOfBanks,
      oscillatorsPerBank: oscillatorsPerBank
    });
    await lastValueFrom(timer(500));
  }

  public keyDown(key: number, velocity: number): void {
    this.port?.postMessage({type: 'keyDown', key, velocity});
  }

  public keyUp(key: number): void {
    this.port?.postMessage({type: 'keyUp', key});
  }

  lastReal: number[] = [];
  lastImag: number[] = [];
  lastTable!: Promise<AudioBuffer[]>;
  readonly startFx = 20;

  public createPeriodicWave(audioCtx: AudioContext, real: number[], imag: number[], constraints: {
    disableNormalization: boolean
  } = {disableNormalization: false}): Promise<AudioBuffer[]> {
    if (real === this.lastReal && imag === this.lastImag) return this.lastTable;
    this.lastReal = real;
    this.lastImag = imag;
    const refFreq = audioCtx.sampleRate / this.waveTableSize;
    const sampleRate = audioCtx.sampleRate;
    const retVal = [];
    const root2 = Math.pow(2, 1 / 2);
    for (let fx = this.startFx; fx < sampleRate / 2; fx *= root2) {
      const olac = new OfflineAudioContext(1, this.waveTableSize, sampleRate);
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
    const waveTables: Float32Array = new Float32Array(this.waveTableSize * this.numberOfBands);
    periodicWaves.then(aba => {
      let length = 0;
      let numberOfBands = 0;
      // Merge all the separate wavetables into one contiguous array
      aba.forEach(ab => {
        const channelData = ab.getChannelData(0)
        waveTables.set(channelData, length);
        length += channelData.length;
        ++numberOfBands;
      });

      this.port.postMessage({type: 'periodicWave', bank, waveTables, numberOfBands});
    });
  }

  public envelope(bank: number, phase: number, value: number): void {
    this.port?.postMessage({type: 'envelope', bank: bank, phase: phase, value: value});
  }

  private readonly sixthRoot2: number = 1.122462048;

  public pitchEnvelope(bank: number, phase: number, value: number): void {
    if (phase === pitchEnvelopePhase.attackLevel || phase === pitchEnvelopePhase.sustainLevel || phase === pitchEnvelopePhase.releaseLevel) {
      value = Math.pow(this.sixthRoot2, value * 48);
    }

    this.port?.postMessage({type: 'pitchEnvelope', bank: bank, phase: phase, value: value});
  }

  public filterPitchEnvelope(bank: number, phase: number, value: number): void {
    if (phase === pitchEnvelopePhase.attackLevel || phase === pitchEnvelopePhase.sustainLevel || phase === pitchEnvelopePhase.releaseLevel) {
      value = Math.pow(this.sixthRoot2, value * 48);
    }

    this.port?.postMessage({type: 'filterPitchEnvelope', bank: bank, phase: phase, value: value});
  }

  public usePitchEnvelope(bank: number, value: boolean): void {
    this.port?.postMessage({type: 'usePitchEnvelope', bank: bank, value: value});
  }

  public filterTuning(bank: number, filterTuning: number): void {
    this.port?.postMessage({type: 'filterTuning', bank, filterTuning});
  }

  public filterDetune(bank: number, filterDetune: number): void {
    this.port?.postMessage({type: 'filterDetune', bank, filterDetune});
  }

  public filterQFactor(bank: number, filterQFactor: number): void {
    this.port?.postMessage({type: 'filterQFactor', bank, filterQFactor});
  }

  public useFilterPitchEnvelope(bank: number, value: boolean): void {
    this.port?.postMessage({type: 'useFilterPitchEnvelope', bank: bank, value: value});
  }

  public oscillatorOutputToFilter(bank: number, outputToFilter: boolean): void {
    this.port?.postMessage({type: 'outputToFilter', bank, outputToFilter});
  }

  public useFilter(bank: number, useFilter: boolean): void {
    this.port?.postMessage({type: 'useFilter', bank, useFilter});
  }

  public setOscillatorLevel(bank: number, oscillatorLevel: number): void {
    this.port?.postMessage({type: 'setOscillatorLevel', bank, oscillatorLevel});
  }

  public setFilterLevel(bank: number, filterLevel: number,): void {
    this.port?.postMessage({type: 'setFilterLevel', bank, filterLevel});
  }

  public setFilterMorphMode(bank: number, filterMorphMode: number): void {
    this.port?.postMessage({type: 'setFilterMorphMode', bank, filterMorphMode});
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  public setGain(gain: number, bank: number) {
    this.setOscillatorLevel(bank, gain);
    //this.gainNodes[bank].gain.value = gain;
  }

  public connect(dest: AudioNode, output: number, input?: number): AudioNode {
    return this.gainNodes[output].connect(dest);
  }

  public disconnect(output: number) {
    this.gainNodes[output].disconnect();
  }

  connectFilter(dest: AudioNode, output: number) {
    this.synthNode.connect(dest, output + this._numberOfBanks);
  }

  disconnectFilter(output: number) {
    this.synthNode.disconnect(output + this._numberOfBanks);
  }

  public tuning(tuning: number, bank: number): void {
    this.port.postMessage({type: 'tuning', bank: bank, tuning: tuning});
  }

  public detune(detune: number, bank: number): void {
    this.port.postMessage({type: 'detune', bank: bank, detune: detune});
  }

  public setModType(modBank: number, carrierBank: number, modType: oscModType) {
    this.port.postMessage({type: "setModType", modBank: modBank, carrierBank: carrierBank, modType: modType});
  }

  public setModLevel(modBank: number, carrierBank: number, modLevel: number) {
    this.port.postMessage({type: "setModLevel", modBank: modBank, carrierBank: carrierBank, modLevel: modLevel});
  }

  setOutputWaveform(type: OscillatorType, bank: number) {
    const wtDetails = WaveTables.wavetables.find(el => el.value === type);
    if (wtDetails) {
      this.setPeriodicWave(this.createPeriodicWave(this.audioContext, wtDetails?.waveTable.real, wtDetails?.waveTable.imag), bank);
    } else {
      console.error("Cannot find wave table for" + type)
    }
  }

  setModOutput(bank: number, modOutput: oscModOutput) {
    this.port.postMessage({type: "setModOutput", modBank: bank, modOutput: modOutput});
  }

  setVelocitySensitive(bank: number, velocitySensitive: boolean) {
    this.port.postMessage({type: "setVelocitySensitive", bank: bank, velocitySensitive: velocitySensitive});
  }

  applySettings(proxySettings: OscillatorSettings, bank: number) {
    this.tuning(100, bank);
    this.envelope(bank, envelopePhase.attack, proxySettings.adsr.attackTime);
    this.envelope(bank, envelopePhase.decay, proxySettings.adsr.decayTime);
    this.envelope(bank, envelopePhase.sustain, proxySettings.adsr.sustainLevel);
    this.envelope(bank, envelopePhase.release, proxySettings.adsr.releaseTime);
    this.envelope(bank, envelopePhase.legato, proxySettings.legatoMode ? 1 : 0)
    //  this.setFreqBendEnvelope(proxySettings.freqBend);
    //  this.useFreqBendEnvelope(proxySettings.useFrequencyEnvelope === onOff.on);
    this.setOutputWaveform(proxySettings.waveForm, bank);
    // this.clearModulation();  // Remove any preexisting mod settings
  }

  setLFOModType(bank: number, modType: oscModType) {
    this.port.postMessage({type: 'setLFOModType', bank: bank, modType: modType});
  }

  setLFOWaveform(bank: number, waveform: modWaveforms) {
    this.port.postMessage({type: 'setLFOWaveform', bank: bank, waveform: waveform});
  }

  setLFOFrequency(bank: number, frequency: number) {
    this.port.postMessage({type: 'setLFOFrequency', bank: bank, frequency});
  }

  setLFOLevel(bank: number, level: number) {
    this.port.postMessage({type: 'setLFOLevel', bank: bank, level});
  }

  setFilterLFOModType(bank: number, modType: filterModType) {
    this.port.postMessage({type: 'setFilterLFOModType', bank: bank, modType: modType});
  }

  setFilterLFOWaveform(bank: number, waveform: modWaveforms) {
    this.port.postMessage({type: 'setFilterLFOWaveform', bank: bank, waveform: waveform});
  }

  setFilterLFOFrequency(bank: number, frequency: number) {
    this.port.postMessage({type: 'setFilterLFOFrequency', bank: bank, frequency});
  }

  setFilterLFOLevel(bank: number, level: number) {
    this.port.postMessage({type: 'setFilterLFOLevel', bank: bank, level});
  }

  addKeyDownHandler(handler: (bank: number, device: number, key: number, velocity: number) => void) {
    if (!this.keyDownHandlers.find(h => h === handler)) {
      this.keyDownHandlers.push(handler);
    }
  }

  removeKeyDownHandler(handler: (bank: number, device: number, key: number, velocity: number) => void) {
    const i = this.keyDownHandlers.findIndex(h => h === handler);
    if (i !== -1)
      this.keyDownHandlers.splice(i, 1);
  }

  addKeyUpHandler(handler: (bank: number, device: number, key: number) => void) {
    if (!this.keyUpHandlers.find(h => h === handler)) {
      this.keyUpHandlers.push(handler);
    }
  }

  removeKeyUpHandler(handler: (device: number, key: number) => void) {
    const i = this.keyUpHandlers.findIndex(h => h === handler);
    if (i !== -1)
      this.keyUpHandlers.splice(i, 1);
  }

  // Redundant, browser will clean up when app is shut down
  private performCleanup() {
    this.port.postMessage({type: "shutDown"});
    this.synthNode.disconnect();
  }
}
