import {Injectable} from '@angular/core';
import {OscillatorSettings} from '../settings/oscillator';
import {modWaveforms, oscModOutput, oscModType} from '../enums/enums';
import {envelopePhase} from '../oscillator/oscillator.component';
import {lastValueFrom, timer} from 'rxjs';

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

  async initializeSynth(audioCtx: AudioContext, numberOfBanks: number = 4, oscillatorsPerBank: number = 12): Promise<void> {
    if (!this.audioContext) {
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
      numberOfOutputs: numberOfBanks,
      outputChannelCount: Array(numberOfBanks).fill(1),
      channelInterpretation: 'speakers',
      processorOptions: {
        numberOfBanks: numberOfBanks,
        oscillatorsPerBank: oscillatorsPerBank,
        waveTableSize: 2048,
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

  public envelope(bank: number, phase: number, value: number): void {
    this.port?.postMessage({type: 'envelope', bank: bank, phase: phase, value: value});
  }

  public pitchEnvelope(bank: number, phase: number, value: number): void {
    this.port?.postMessage({type: 'pitchEnvelope', bank: bank, phase: phase, value: value});
  }

  public setPitchEnvelope(bank: number, value: boolean): void {
    this.port?.postMessage({type: 'setPitchEnvelope', bank: bank, value: value});
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  public setGain(gain: number, bank: number) {
    this.gainNodes[bank].gain.value = gain;
  }

  public connect(dest: AudioNode, output: number, input?: number): AudioNode {
    return this.gainNodes[output].connect(dest);
  }

  public disconnect(output: number) {
    this.gainNodes[output].disconnect();
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

  setType(type: OscillatorType, bank: number) {
    // if (/^(sine)$/.test(type)) {
    //   this.synthNode.setType(type, bank);
    // } else {
    //   const wtDetails = WaveTables.wavetables.find(el => el.value === type);
    //   if (wtDetails) {
    //     this.synthNode.setPeriodicWave(OscillatorArray.createPeriodicWave(this.audioContext, wtDetails?.waveTable.real, wtDetails?.waveTable.imag), bank);
    //     this.synthNode.setType(type, bank);
    //   } else {
    //     console.error("Cannot find wave table for" + type)
    //     this.synthNode.setType("sine", bank);
    //   }
    // }
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
    this.setType(proxySettings.waveForm, bank);
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

  shutDown() {
    this.port.postMessage({type: "shutDown"});
  }
}
