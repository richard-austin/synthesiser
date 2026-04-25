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
  private readonly signalKeydown: WritableSignal<DeviceKeys>[];
  private readonly signalKeyup: WritableSignal<DeviceKeys>[];
  private readonly effectRefKeyUp: EffectRef[];
  private readonly effectRefKeydown: EffectRef[];
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


  keyDown(key: DeviceKeys, index: number): void {
    this.signalKeydown[index].set(key);
  }
  keyUp(key: DeviceKeys, index: number): void {
    this.signalKeyup[index].set(key);
  }

  ngOnDestroy() {
    if(this.effectRefKeyUp)
      this.effectRefKeyUp.forEach(er => er.destroy());
    if(this.effectRefKeydown)
      this.effectRefKeydown.forEach(er => er.destroy());
  }
}
