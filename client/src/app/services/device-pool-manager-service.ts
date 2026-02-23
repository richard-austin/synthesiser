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
  private signalKeydownNoise = signal<DeviceKeys>(new DeviceKeys(-1, -1)); // For oscillator 2 and its filters
  private signalKeyupNoise = signal<DeviceKeys>(new DeviceKeys(-1, -1)); // For oscillator 2 and its filters

  private effectRef1: EffectRef = effect(() => {
    this.signalKeydown1();
    if (this.notifyKeyDown1)
      this.notifyKeyDown1(this.signalKeydown1());
  });

  private effectRef2: EffectRef = effect(() => {
    this.signalKeydown2();
    if (this.notifyKeyDown2)
      this.notifyKeyDown2(this.signalKeydown2());
  });

  private effectRef3: EffectRef = effect(() => {
    this.signalKeyup1();
    if (this.notifyKeyUp1)
      this.notifyKeyUp1(this.signalKeyup1());
  });

  private effectRef4: EffectRef = effect(() => {
    this.signalKeyup2();
    if (this.notifyKeyUp2)
      this.notifyKeyUp2(this.signalKeyup2());
  });

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

  public notifyKeyDown1!: (key: DeviceKeys) => void;  // Callback to notify oscillators1 keydown to filters
  public notifyKeyDown2!: (key: DeviceKeys) => void;  // Callback to notify oscillators2 keydown to filters
  public notifyKeyUp1!: (key: DeviceKeys) => void;    // Callback to notify oscillators1 keyup to filters
  public notifyKeyUp2!: (key: DeviceKeys) => void;    // Callback to notify oscillators2 keyup to filters
  public notifyKeyDownNoise!: (key: DeviceKeys) => void; // Callback to notify noise gen key down to filters
  public notifyKeyUpNoise!: (key: DeviceKeys) => void; // Callback to notify noise gen key down to filters

  keyDownOscillator1(deviceKeys: DeviceKeys) {
    this.signalKeydown1.set(deviceKeys);
  }

  keyDownOscillator2(deviceKeys: DeviceKeys) {
    this.signalKeydown2.set(deviceKeys);
  }

  keyUpOscillator1(deviceKeys: DeviceKeys) {
    this.signalKeyup1.set(deviceKeys);
  }

  keyUpOscillator2(deviceKeys: DeviceKeys) {
    this.signalKeyup2.set(deviceKeys);
  }

  keyDownNoise(deviceKeys: DeviceKeys) {
    this.signalKeydownNoise.set(deviceKeys);
  }

  keyUpNoise(deviceKeys: DeviceKeys) {
    this.signalKeyupNoise.set(deviceKeys);
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
    if(this.effectRef5) {
      this.effectRef5.destroy();
    }
    if (this.effectRef6) {
      this.effectRef6.destroy();
    }
  }
}
