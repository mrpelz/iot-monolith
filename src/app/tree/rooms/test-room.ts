/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { espNowButton } from '../../../lib/tree/devices/esp-now-button.js';
import { espNowWindowSensor } from '../../../lib/tree/devices/esp-now-window-sensor.js';
import { testDevice } from '../../../lib/tree/devices/test-device.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Element, Level } from '../../../lib/tree/main.js';
import { logger } from '../../logging.js';
import { persistence } from '../../persistence.js';
import { timings } from '../../timings.js';
import { espNowTransport } from '../../tree/bridges.js';

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
  brightness: devices.testDevice.props.internal.brightness,
  co2: devices.testDevice.props.internal.co2,
  espNowWindowSensor0:
    devices.espNowWindowSensor.props.espNow.props.internal.input0,
  espNowWindowSensor1:
    devices.espNowWindowSensor.props.espNow.props.internal.input1,
  espNowWindowSensor2:
    devices.espNowWindowSensor.props.espNow.props.internal.input2,
  humidity: devices.testDevice.props.internal.humidity,
  motion: devices.testDevice.props.internal.motion,
  pm025: devices.testDevice.props.internal.pm025,
  pm10: devices.testDevice.props.internal.pm10,
  pressure: devices.testDevice.props.internal.pressure,
  temperature: devices.testDevice.props.internal.temperature,
  uvIndex: devices.testDevice.props.internal.uvIndex,
};

export const groups = {};

(() => {
  // noop
})();

export const testRoom = new Element({
  $: 'testRoom' as const,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
