/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Levels,
  MetaPropertySensor,
  ParentRelation,
  ValueType,
  metadataExtensionStore,
  metadataStore,
} from '../main.js';
import { ObservableGroup, ReadOnlyObservable } from '../../observable.js';
import {
  Timings,
  async,
  bme280,
  hello,
  input,
  lastSeen,
  mcp9808,
  mhz19,
  online,
  sds011,
  tsl2561,
  uvIndex,
} from '../properties/sensors.js';
import { Logger } from '../../log.js';
import { UDPDevice } from '../../device/udp.js';

export const testDevice = (logger: Logger, timings: Timings) => {
  const device = new UDPDevice(
    logger,
    'test-device.iot-ng.lan.wurstsalat.cloud',
    1337
  );

  const {
    humidity,
    pressure,
    temperature: bme280Temperature,
  } = bme280(device, timings.default);

  const { temperature: mcp9808Temperature } = mcp9808(device, timings.default);

  const result = {
    ...async(device, timings.slow || timings.default),
    ...hello(device, timings.moderate || timings.default),
    ...lastSeen(device.seen),
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
      };

      metadataExtensionStore.set<MetaPropertySensor, typeof _temperature>(
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

      metadataStore.set(_temperature, {
        level: Levels.PROPERTY,
        measured: 'temperature',
        name: 'compoundTemperature',
        type: 'sensor',
        unit: 'deg-c',
        valueType: ValueType.NUMBER,
      });

      return _temperature;
    })(),
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
    name: 'testDevice',
  });

  return result;
};
