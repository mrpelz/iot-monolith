import {
  bme280,
  hello,
  input,
  mcp9808,
  mhz19,
  online,
  tsl2561,
} from './metrics.js';
import { UDPDevice } from '../device/udp.js';
import { combineObservables } from '../observable.js';
import { metadataStore } from '../hierarchy.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const roomSensor = (host: string, port = 1337) => {
  const device = new UDPDevice(host, port);

  const { humidity, pressure, temperature: bme280Temperature } = bme280(device);
  const { temperature: mcp9808Temperature } = mcp9808(device);

  const result = {
    ...hello(device),
    ...mhz19(device),
    ...online(device),
    ...tsl2561(device),
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
    name: 'room-sensor',
  });

  return result;
};
