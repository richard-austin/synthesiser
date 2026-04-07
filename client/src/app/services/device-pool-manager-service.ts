import {effect, EffectRef, Injectable, OnDestroy, signal, WritableSignal} from '@angular/core';
import {SynthComponent} from '../synth/synth-component';

export class DeviceKeys {
  public  keyIndex: number;  // Index of Midi key pressed
  public  deviceIndex: number; // index to the device in the pool
  public readonly filterTimeout: number;

  constructor(keyIndex: number, deviceIndex: number, filterTimeout: number) {
    this.keyIndex = keyIndex;
    this.deviceIndex = deviceIndex;
    this.filterTimeout = filterTimeout;
  }
}

@Injectable({
  providedIn: 'root',
})
export class DevicePoolManagerService implements OnDestroy {
  private signalKeydown: WritableSignal<DeviceKeys>[];
  private signalKeyup: WritableSignal<DeviceKeys>[];
  private effectRefKeyUp: EffectRef[];
  private effectRefKeydown: EffectRef[];
  public notifyKeydown!: ((key: DeviceKeys) => void)[];
  public notifyKeyup!: ((key: DeviceKeys) => void)[];

  constructor() {
    this.signalKeydown= [];
    this.signalKeyup = [];
    this.effectRefKeyUp = [];
    this.effectRefKeydown = [];
    this.notifyKeydown = [];
    this.notifyKeyup = [];
    SynthComponent.oscillatorParams.forEach((p, i) =>{
      this.signalKeydown.push(signal<DeviceKeys>(new DeviceKeys(-1, -1, 0)));
      this.signalKeyup.push(signal<DeviceKeys>(new DeviceKeys(-1, -1, 0)));
      this.effectRefKeyUp.push(effect(() => {
        this.signalKeyup[i]();
        if (this.notifyKeyup[i])
          this.notifyKeyup[i](this.signalKeyup[i]());
      }));
      this.effectRefKeydown.push(effect(() => {
        this.signalKeydown[i]();
        if(this.notifyKeydown[i]) {
          this.notifyKeydown[i](this.signalKeydown[i]());
        }
      }))
    });
  }


  // Signal to set the corresponding filter and its frequency when activating an oscillator
  private signalKeydownNoise = signal<DeviceKeys>(new DeviceKeys(-1, -1, 0)); // For oscillator 2 and its filters
  private signalKeyupNoise = signal<DeviceKeys>(new DeviceKeys(-1, -1, 0)); // For oscillator 2 and its filters

  private effectRef5: EffectRef = effect(() => {
    this.signalKeydownNoise();
    if(this.notifyKeyDownNoise)
      this.notifyKeyDownNoise(this.signalKeydownNoise());
  });

  private effectRef6: EffectRef = effect(() => {
    this.signalKeyupNoise();
    if(this.notifyKeyUpNoise)
      this.notifyKeyUpNoise(this.signalKeyupNoise());
  });

  public notifyKeyDownNoise!: (key: DeviceKeys) => void; // Callback to notify noise gen key down to filters
  public notifyKeyUpNoise!: (key: DeviceKeys) => void; // Callback to notify noise gen key down to filters

  keyDown(key: DeviceKeys, index: number): void {
    this.signalKeydown[index].set(key);
  }
  keyUp(key: DeviceKeys, index: number): void {
    this.signalKeyup[index].set(key);
  }

  keyDownNoise(deviceKeys: DeviceKeys) {
    this.signalKeydownNoise.set(deviceKeys);
  }

  keyUpNoise(deviceKeys: DeviceKeys) {
    this.signalKeyupNoise.set(deviceKeys);
  }

  ngOnDestroy() {
    if(this.effectRefKeyUp)
      this.effectRefKeyUp.forEach(er => er.destroy());
    if(this.effectRefKeydown)
      this.effectRefKeydown.forEach(er => er.destroy());

    if(this.effectRef5) {
      this.effectRef5.destroy();
    }
    if (this.effectRef6) {
      this.effectRef6.destroy();
    }
  }
}
