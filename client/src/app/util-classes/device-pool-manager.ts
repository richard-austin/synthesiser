import {Oscillator} from '../modules/oscillator';
import {Filter} from '../modules/filter';
import {OscillatorSettings} from '../settings/oscillator';
import {FilterSettings} from '../settings/filter';
import {DeviceKeys} from '../services/device-pool-manager-service';


class DeviceStatus {
  public inUse: boolean = false;
  public keyIndex: number = 0;
  public readonly device: Oscillator | Filter;
  public deviceKeys: DeviceKeys;

  constructor(device: Oscillator | Filter, deviceKeys: DeviceKeys) {
    this.device = device;
    this.deviceKeys = deviceKeys;
  }

  keyUp() {
    const device = this.device;
    if (device instanceof Oscillator) {
      this.inUse = false;
      this.keyIndex = -1;
      device.keyUp();
    } else if (device) {
      this.inUse = false;
      this.keyIndex = -1;
      device.keyUp();
    }
  }
}

class DevicePoolManager {
  public static readonly numberOfDevices: number = 12; // Number of oscillators and filters in a pool
  private readonly devices: DeviceStatus[];
  private readonly settings: OscillatorSettings | FilterSettings;

  constructor(devices: Oscillator[] | Filter[], settings: OscillatorSettings | FilterSettings) {
    this.devices = [];
    devices.forEach(device => {
      this.devices.push(new DeviceStatus(device, new DeviceKeys(-1, -1))); // The devices should already be set up snd started
    });
    this.settings = settings;
  }

  private findFirstAvailable(keyIndex: number): DeviceStatus {
    let deviceIndex = this.devices.findIndex(device => {
      return !device.inUse;
    });

    let firstAvailable: DeviceStatus | undefined;

    if (deviceIndex === -1) {
      firstAvailable = this.devices[0];
      firstAvailable.deviceKeys.deviceIndex = 0;
    } else {
      firstAvailable = this.devices[deviceIndex];
      firstAvailable.deviceKeys = new DeviceKeys(keyIndex, deviceIndex);
    }
    return firstAvailable;
  }

  private findDeviceFromKeyIndex(keyIndex: number): DeviceStatus | undefined {
    const deviceIndex = this.devices.findIndex(device => {
      return device.keyIndex === keyIndex;
    });

    let dev: DeviceStatus | undefined = undefined;

    if (deviceIndex > -1) {
      dev = this.devices[deviceIndex];
      dev.deviceKeys = new DeviceKeys(keyIndex, deviceIndex);
    }
    return dev;
  }

  private keyToFrequency = (key: number) => {
    return Oscillator.frequencyFactor * Math.pow(Math.pow(2, 1 / 12), (key + 1) + 120 * this.settings.frequency * 6 /*this.tuningDivisions*/ / 10);
  }

  setFrequency(frequency: number) {
    this.settings.frequency = frequency;
    this.devices.forEach(device => {
      if (device.inUse) {
        const freq = this.keyToFrequency(device.deviceKeys.keyIndex);
        const dev = device.device;
        dev.freq = frequency;
        if (dev instanceof Oscillator) {
          dev.oscillator.frequency.value = freq;
        } else {
          dev.filter.frequency.value = dev.filter2.frequency.value = freq;
        }
      }
    });
  }

  keyDown(keyIndex: number, velocity: number): DeviceKeys | undefined {
    let device = this.findDeviceFromKeyIndex(keyIndex);
    if (!device) {
      device = this.findFirstAvailable(keyIndex);
    }
    if (device) {
      const dev = device.device;
      const freq = this.keyToFrequency(keyIndex);
      dev.freq = freq;
      if (dev instanceof Oscillator)
        dev.oscillator.frequency.value = freq;
      else
        dev.filter.frequency.value = freq;

      device.inUse = true;
      device.keyIndex = keyIndex;
      device.device.keyDown(velocity);
    }
    return device?.deviceKeys;
  }

  keyUp(keyIndex: number): DeviceKeys | undefined {
    const device = this.findDeviceFromKeyIndex(keyIndex);
    if (device) {
      device.keyUp()
    }
    return device?.deviceKeys;
  }
}

export default DevicePoolManager
