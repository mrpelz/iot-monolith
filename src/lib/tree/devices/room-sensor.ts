/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Levels,
  MetaPropertySensor,
  ParentRelation,
  ValueType,
  addMeta,
  addMetaExtension,
} from '../main.js';
import { ObservableGroup, ReadOnlyObservable } from '../../observable.js';
import {
  Timings,
  bme280,
  input,
  mcp9808,
  mhz19,
  tsl2561,
} from '../properties/sensors.js';
import { defaultsIpDevice, deviceMeta } from './utils.js';
import { Logger } from '../../log.js';
import { UDPDevice } from '../../device/udp.js';

export const roomSensor = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);

  const {
    humidity,
    pressure,
    temperature: bme280Temperature,
  } = bme280(device, timings.default);

  const { temperature: mcp9808Temperature } = mcp9808(device, timings.default);

  return addMeta(
    {
      ...defaultsIpDevice(device, timings),
      ...mhz19(device, timings.slow || timings.default),
      ...tsl2561(device, timings.default),
      humidity,
      motion: input(device, undefined, 'motion'),
      pressure,
      temperature: (() => {
        const _temperature = addMeta(
          {
            _get: new ReadOnlyObservable(
              new (class extends ObservableGroup<number | null> {
                protected _merge(): number | null {
                  const validValues = this.values.filter(
                    (value): value is number => typeof value === 'number'
                  );

                  return validValues.length ? Math.min(...validValues) : null;
                }
              })(null, [mcp9808Temperature._get, bme280Temperature._get])
            ),
            bme280: bme280Temperature,
            mcp9808: mcp9808Temperature,
          },
          {
            level: Levels.PROPERTY,
            measured: 'temperature',
            name: 'compoundTemperature',
            type: 'sensor',
            unit: 'deg-c',
            valueType: ValueType.NUMBER,
          }
        );

        addMetaExtension<MetaPropertySensor, typeof _temperature>(
          _temperature,
          {
            bme280: {
              parentRelation: ParentRelation.DATA_AGGREGATION_SOURCE,
            },
            mcp9808: {
              parentRelation: ParentRelation.DATA_AGGREGATION_SOURCE,
            },
          }
        );

        return _temperature;
      })(),
    },
    {
      ...deviceMeta(device),
    }
  );
};
