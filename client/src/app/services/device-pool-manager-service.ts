import {effect, EffectRef, Injectable, OnDestroy, signal} from '@angular/core';

export class DeviceKeys {
  public keyIndex: number;  // Index of Midi key pressed
  public deviceIndex: number; // index to the device in the pool

  constructor(keyIndex: number, deviceIndex: number) {
    this.keyIndex = keyIndex;
    this.deviceIndex = deviceIndex;
  }
}

@Injectable({
  providedIn: 'root',
})
export class DevicePoolManagerService implements OnDestroy {
  // Signal to set the corresponding filter and its frequency when activating an oscillator
  private signalKeydown1 = signal<DeviceKeys>(new DeviceKeys(-1, -1));  // For oscillator 1 and its filters
  private signalKeydown2 = signal<DeviceKeys>(new DeviceKeys(-1, -1)); // For oscillator 2 and its filters
  private signalKeyup1 = signal<DeviceKeys>(new DeviceKeys(-1, -1));  // For oscillator 1 and its filters
  private signalKeyup2 = signal<DeviceKeys>(new DeviceKeys(-1, -1)); // For oscillator 2 and its filters

  private effectRef1: EffectRef = effect(() => {
    this.signalKeydown1();
    console.log("keydown1");
    if (this.notifyKeyDown1)
      this.notifyKeyDown1(this.signalKeydown1());
  });

  private effectRef2: EffectRef = effect(() => {
    this.signalKeydown2();
    console.log("keydown2");
    if (this.notifyKeyDown2)
      this.notifyKeyDown2(this.signalKeydown2());
  });

  private effectRef3: EffectRef = effect(() => {
    this.signalKeyup1();
    console.log("keyup");
    if (this.notifyKeyUp1)
      this.notifyKeyUp1(this.signalKeyup1());
  });

  private effectRef4: EffectRef = effect(() => {
    this.signalKeyup2();
    console.log("keyup2");
    if (this.notifyKeyUp2)
      this.notifyKeyUp2(this.signalKeyup2());
  });

  public notifyKeyDown1!: (key: DeviceKeys) => void;  // Callback to notify oscillators1 keydown to filters
  public notifyKeyDown2!: (key: DeviceKeys) => void;  // Callback to notify oscillators2 keydown to filters
  public notifyKeyUp1!: (key: DeviceKeys) => void;    // Callback to notify oscillators1 keyup to filters
  public notifyKeyUp2!: (key: DeviceKeys) => void;    // Callback to notify oscillators2 keyup to filters

  keyDown1(deviceKeys: DeviceKeys) {
    this.signalKeydown1.set(deviceKeys);
  }

  keyDown2(deviceKeys: DeviceKeys) {
    this.signalKeydown2.set(deviceKeys);
  }

  keyUp1(deviceKeys: DeviceKeys) {
    this.signalKeyup1.set(deviceKeys);
  }

  keyUp2(deviceKeys: DeviceKeys) {
    this.signalKeyup2.set(deviceKeys);
  }

  ngOnDestroy() {
    if (this.effectRef1) {
      this.effectRef1.destroy();
    }
    if (this.effectRef2) {
      this.effectRef2.destroy();
    }
    if(this.effectRef3) {
      this.effectRef3.destroy();
    }
    if (this.effectRef4) {
      this.effectRef4.destroy();
    }
  }
}
