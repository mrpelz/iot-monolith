import { espNowButton } from '../../../lib/tree/devices/esp-now-button.js';
import { espNowWindowSensor } from '../../../lib/tree/devices/esp-now-window-sensor.js';
import { testDevice } from '../../../lib/tree/devices/test-device.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { context } from '../../context.js';
import { espNowTransport } from '../bridges.js';

export const devices = {
  espNowButton: espNowButton(
    {
      espNow: {
        // prettier-ignore
        macAddress: [0x70, 0x3, 0x9f, 0x7, 0x83, 0xdf],
        transport: espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-button.iot-ng.lan.wurstsalat.cloud',
      },
    },
    context,
  ),
  espNowWindowSensor: espNowWindowSensor(
    {
      espNow: {
        // prettier-ignore
        macAddress: [0xdc, 0x4f, 0x22, 0x57, 0xe7, 0xf0],
        transport: espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-window-sensor.iot-ng.lan.wurstsalat.cloud',
      },
    },
    context,
  ),
  testDevice: testDevice(context),
};

export const instances = {
  espNowButton0: devices.espNowButton.espNow.internal.button0.state,
  espNowButton1: devices.espNowButton.espNow.internal.button1.state,
};

export const properties = {
  brightness: devices.testDevice.internal.brightness,
  co2: devices.testDevice.internal.co2,
  espNowWindowSensor0: devices.espNowWindowSensor.espNow.internal.input0,
  espNowWindowSensor1: devices.espNowWindowSensor.espNow.internal.input1,
  espNowWindowSensor2: devices.espNowWindowSensor.espNow.internal.input2,
  humidity: devices.testDevice.internal.humidity,
  motion: devices.testDevice.internal.motion,
  pm025: devices.testDevice.internal.pm025,
  pm10: devices.testDevice.internal.pm10,
  pressure: devices.testDevice.internal.pressure,
  temperature: devices.testDevice.internal.temperature,
  uvIndex: devices.testDevice.internal.uvIndex,
};

export const groups = {};

(() => {
  // noop
})();

export const testRoom = {
  $: 'testRoom' as const,
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
};
