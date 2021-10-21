/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree.js';
import { espNowTransport, ev1527Transport } from '../bridges.js';
import { Logger } from '../../lib/log.js';
import { espNowButton } from '../../lib/groupings/esp-now-button.js';
import { espNowWindowSensor } from '../../lib/groupings/esp-now-window-sensor.js';
import { ev1527ButtonX1 } from '../../lib/groupings/ev1527-button.js';
import { testDevice } from '../../lib/groupings/test-device.js';
import { timings } from '../timings.js';

export function testRoom(logger: Logger) {
  const nodes = {
    blueButton: ev1527ButtonX1(ev1527Transport, 74160, logger),
    espNowButton: espNowButton(logger, timings, {
      espNow: {
        // prettier-ignore
        macAddress: [0x70, 0x3, 0x9f, 0x7, 0x83, 0xdf],
        transport: espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-button.iot-ng.lan.wurstsalat.cloud',
      },
    }),
    espNowWindowSensor: espNowWindowSensor(logger, timings, {
      espNow: {
        // prettier-ignore
        macAddress: [0xdc, 0x4f, 0x22, 0x57, 0xe7, 0xf0],
        transport: espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-window-sensor.iot-ng.lan.wurstsalat.cloud',
      },
    }),
    grayButton: ev1527ButtonX1(ev1527Transport, 4448, logger),
    orangeButton: ev1527ButtonX1(ev1527Transport, 307536, logger),
    testDevice: testDevice(logger, timings),
  };

  const {
    brightness,
    co2,
    humidity,
    motion,
    pm025,
    pm10,
    pressure,
    temperature,
    uvIndex,
  } = nodes.testDevice;

  const result = {
    ...nodes,
    brightness,
    co2,
    humidity,
    motion,
    pm025,
    pm10,
    pressure,
    temperature,
    uvIndex,
  };

  metadataStore.set(result, {
    isDaylit: true,
    level: Levels.ROOM,
    name: 'testRoom',
  });

  return result;
}
