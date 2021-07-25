import {
  bme280,
  hello,
  input,
  mcp9808,
  mhz19,
  online,
  tsl2561,
} from './metrics.js';
import { Meta } from '../hierarchy.js';
import { UDPDevice } from '../device/udp.js';
import { combineObservables } from '../observable.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const roomSensor = (host: string, port = 1337) => {
  const device = new UDPDevice(host, port);

  const { humidity, pressure, temperature: bme280Temperature } = bme280(device);
  const { temperature: mcp9808Temperature } = mcp9808(device);

  const temperature = () => {
    return {
      temperature: {
        meta: <Meta>{
          metric: 'temperature',
          type: 'number',
          unit: 'celsius',
        },
        nodes: {
          bme280: bme280Temperature,
          mcp9808: mcp9808Temperature,
        },
        state: combineObservables(
          (...values) => {
            const validValues = values.filter(
              (value): value is number => typeof value === 'number'
            );

            return validValues.length ? Math.min(...validValues) : null;
          },
          null,
          mcp9808Temperature.state,
          bme280Temperature.state
        ),
      },
    };
  };

  return {
    meta: <Meta>{
      name: 'room-sensor',
    },
    nodes: {
      ...hello(device),
      ...mhz19(device),
      ...online(device),
      ...temperature(),
      ...tsl2561(device),
      humidity,
      motion: input(device),
      pressure,
    },
  };
};
