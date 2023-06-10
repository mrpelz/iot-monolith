/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../../lib/tree/main-ng.js';
import { espNowButton } from '../../lib/tree/devices/esp-now-button.js';
import { espNowTransport } from '../bridges.js';
import { espNowWindowSensor } from '../../lib/tree/devices/esp-now-window-sensor.js';
import { logger } from '../logging.js';
import { persistence } from '../persistence.js';
import { testDevice } from '../../lib/tree/devices/test-device.js';
import { timings } from '../timings.js';

export const devices = {
  espNowButton: espNowButton(logger, persistence, timings, {
    espNow: {
      // prettier-ignore
      macAddress: [0x70, 0x3, 0x9f, 0x7, 0x83, 0xdf],
      transport: espNowTransport,
    },
    wifi: {
      host: 'esp-now-test-button.iot-ng.lan.wurstsalat.cloud',
    },
  }),
  espNowWindowSensor: espNowWindowSensor(logger, persistence, timings, {
    espNow: {
      // prettier-ignore
      macAddress: [0xdc, 0x4f, 0x22, 0x57, 0xe7, 0xf0],
      transport: espNowTransport,
    },
    wifi: {
      host: 'esp-now-test-window-sensor.iot-ng.lan.wurstsalat.cloud',
    },
  }),
  testDevice: testDevice(logger, persistence, timings),
};

export const instances = {
  espNowButton0: devices.espNowButton.espNow.button0.instance,
  espNowButton1: devices.espNowButton.espNow.button1.instance,
};

export const properties = {
  brightness: devices.testDevice.brightness,
  co2: devices.testDevice.co2,
  espNowWindowSensor0: devices.espNowWindowSensor.espNow.input0,
  espNowWindowSensor1: devices.espNowWindowSensor.espNow.input1,
  espNowWindowSensor2: devices.espNowWindowSensor.espNow.input2,
  humidity: devices.testDevice.humidity,
  motion: devices.testDevice.motion,
  pm025: devices.testDevice.pm025,
  pm10: devices.testDevice.pm10,
  pressure: devices.testDevice.pressure,
  temperature: devices.testDevice.temperature,
  uvIndex: devices.testDevice.uvIndex,
};

export const groups = {};

(() => {
  // noop
})();

export const testRoom = element({
  devices: element({ ...devices, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
