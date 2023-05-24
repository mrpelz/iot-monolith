/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Element,
  Level,
  ValueType,
  symbolInstance,
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
      mcp9808Temperature.props[symbolMain].props[symbolInstance],
      bme280Temperature.props[symbolMain].props[symbolInstance],
    ])
  );

  const temperature = new Element({
    ...metricStaleness(temperatureState, timings.default[1]),
    bme280: bme280Temperature,
    mcp9808: mcp9808Temperature,
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: getter(ValueType.NUMBER, temperatureState, 'deg-c'),
  });

  return {
    ...async(device, timings.slow || timings.default),
    ...mhz19(device, timings.slow || timings.default),
    ...sds011(device, timings.slow || timings.default),
    ...tsl2561(device, timings.default),
    ...uvIndex(device, timings.default),
    humidity,
    motion: input(device, undefined, 'motion'),
    pressure,
    [symbolMain]: ipDevice(device, persistence, timings),
    temperature,
  };
};
