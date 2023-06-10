/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Level,
  ValueType,
  element,
  symbolLevel,
  symbolMain,
} from '../main-ng.js';
import { ObservableGroup, ReadOnlyObservable } from '../../observable.js';
import {
  Timings,
  bme280,
  // input,
  mcp9808,
  metricStaleness,
  // mhz19,
  sgp30,
  tsl2561,
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

export const roomSensor = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  host: string,
  port = 1337,
  initiallyOnline?: boolean
) => {
  const device = new UDPDevice(logger, host, port);

  const {
    humidity,
    pressure,
    temperature: bme280Temperature,
  } = bme280(device, timings.default);

  const { temperature: mcp9808Temperature } = mcp9808(device, timings.default);

  const temperatureState = new ReadOnlyObservable(
    new MergedObservableGroup(null, [
      mcp9808Temperature.main.instance,
      bme280Temperature.main.instance,
    ])
  );

  const temperature = element({
    ...metricStaleness(temperatureState, timings.default[1]),
    bme280: bme280Temperature,
    mcp9808: mcp9808Temperature,
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: getter(ValueType.NUMBER, temperatureState, 'deg-c'),
  });

  const sgp30MeasurementInputGetter = () => {
    const _humidity = humidity.main.instance.value;
    const _temperature = temperatureState.value;

    if (_humidity === null || _temperature === null) return null;

    return {
      humidity: _humidity,
      temperature: _temperature,
    };
  };

  return element({
    ...ipDevice(device, persistence, timings, undefined, initiallyOnline),
    // ...mhz19(device, timings.slow || timings.default),
    // ...sds011(device, timings.slow || timings.default),
    ...sgp30(
      device,
      timings.slow || timings.default,
      sgp30MeasurementInputGetter
    ),
    ...tsl2561(device, timings.default),
    humidity,
    // motion: input(device, undefined, 'motion'),
    pressure,
    temperature,
  });
};
