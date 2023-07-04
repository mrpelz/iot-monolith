/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level } from '../../lib/tree/main.js';
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
  espNowButton0: devices.espNowButton.props.espNow.props.button0.props.state,
  espNowButton1: devices.espNowButton.props.espNow.props.button1.props.state,
};

export const properties = {
  brightness: devices.testDevice.props.brightness,
  co2: devices.testDevice.props.co2,
  espNowWindowSensor0: devices.espNowWindowSensor.props.espNow.props.input0,
  espNowWindowSensor1: devices.espNowWindowSensor.props.espNow.props.input1,
  espNowWindowSensor2: devices.espNowWindowSensor.props.espNow.props.input2,
  humidity: devices.testDevice.props.humidity,
  motion: devices.testDevice.props.motion,
  pm025: devices.testDevice.props.pm025,
  pm10: devices.testDevice.props.pm10,
  pressure: devices.testDevice.props.pressure,
  temperature: devices.testDevice.props.temperature,
  uvIndex: devices.testDevice.props.uvIndex,
};

export const groups = {};

(() => {
  // noop
})();

export const testRoom = new Element({
  devices: new Element({ ...devices, level: Level.NONE as const }),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
