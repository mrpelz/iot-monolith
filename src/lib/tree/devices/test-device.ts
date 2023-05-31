/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Element,
  Level,
  ValueType,
  symbolLevel,
  symbolMain,
} from '../main-ng.js';
import { ObservableGroup, ReadOnlyObservable } from '../../observable.js';
import {
  Timings,
  async,
  bme280,
  input,
  mcp9808,
  metricStaleness,
  mhz19,
  sds011,
  tsl2561,
  uvIndex,
} from '../properties/sensors.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { UDPDevice } from '../../device/udp.js';
import { getter } from '../elements/getter.js';
import { ipDevice } from '../elements/device.js';

class MergedObservableGroup extends ObservableGroup<number | null> {
  protected _merge(): number | null {
    const validValues = this.values.filter(
      (value): value is number => typeof value === 'number'
    );

    return validValues.length ? Math.min(...validValues) : null;
  }
}

export const testDevice = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings
) => {
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

  const temperatureState = new ReadOnlyObservable(
    new MergedObservableGroup(null, [
      mcp9808Temperature.$main.$instance,
      bme280Temperature.$main.$instance,
    ])
  );

  const temperature = new Element({
    ...metricStaleness(temperatureState, timings.default[1]),
    bme280: bme280Temperature,
    mcp9808: mcp9808Temperature,
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: getter(ValueType.NUMBER, temperatureState, 'deg-c'),
  });

  return new Element({
    ...async(device, timings.slow || timings.default),
    ...ipDevice(device, persistence, timings),
    ...mhz19(device, timings.slow || timings.default),
    ...sds011(device, timings.slow || timings.default),
    ...tsl2561(device, timings.default),
    ...uvIndex(device, timings.default),
    humidity,
    motion: input(device, undefined, 'motion'),
    pressure,
    temperature,
  });
};
