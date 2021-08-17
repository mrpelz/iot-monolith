/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Timings,
  async,
  bme280,
  hello,
  input,
  mcp9808,
  mhz19,
  online,
  sds011,
  tsl2561,
  uvIndex,
} from './metrics.js';
import { Logger } from '../log.js';
import { UDPDevice } from '../device/udp.js';
import { combineObservables } from '../observable.js';
import { metadataStore } from '../tree.js';

export const testDevice = (logger: Logger, timings: Timings) => {
  const device = new UDPDevice(
    logger,
    'test-device.iot-ng.net.wurstsalat.cloud',
    1337
  );

  const {
    humidity,
    pressure,
    temperature: bme280Temperature,
  } = bme280(device, timings.default);

  const { temperature: mcp9808Temperature } = mcp9808(device, timings.default);

  const result = {
    ...async(device, timings.moderate || timings.default),
    ...hello(device, timings.moderate || timings.default),
    ...mhz19(device, timings.slow || timings.default),
    ...online(device),
    ...sds011(device, timings.slow || timings.default),
    ...tsl2561(device, timings.default),
    ...uvIndex(device, timings.default),
    humidity,
    motion: input(device),
    pressure,
    temperature: (() => {
      const _temperature = {
        _get: combineObservables(
          (...values) => {
            const validValues = values.filter(
              (value): value is number => typeof value === 'number'
            );

            return validValues.length ? Math.min(...validValues) : null;
          },
          null,
          mcp9808Temperature._get,
          bme280Temperature._get
        ),
        bme280: bme280Temperature,
        mcp9808: mcp9808Temperature,
      };

      metadataStore.set(_temperature, {
        metric: 'temperature',
        type: 'number',
        unit: 'celsius',
      });

      return _temperature;
    })(),
  };

  metadataStore.set(result, {
    name: 'test-device',
  });

  return result;
};