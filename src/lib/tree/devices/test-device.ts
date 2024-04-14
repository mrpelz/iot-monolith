/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Logger } from '../../log.js';
import { ObservableGroup, ReadOnlyObservable } from '../../observable.js';
import { Persistence } from '../../persistence.js';
import { ipDevice } from '../elements/device.js';
import { getter } from '../elements/getter.js';
import { Element, Level, ValueType } from '../main.js';
import {
  async,
  bme280,
  input,
  mcp9808,
  metricStaleness,
  mhz19,
  sds011,
  Timings,
  tsl2561,
  uvIndex,
} from '../properties/sensors.js';

class MergedObservableGroup extends ObservableGroup<number | null> {
  protected _merge(): number | null {
    const validValues = this.values.filter(
      (value): value is number => typeof value === 'number',
    );

    return validValues.length > 0 ? Math.min(...validValues) : null;
  }
}

export const testDevice = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
) => {
  const device = new UDPDevice(
    logger,
    'test-device.iot-ng.lan.wurstsalat.cloud',
    1337,
  );

  const {
    humidity,
    pressure,
    temperature: bme280Temperature,
  } = bme280(device, timings.default);

  const { temperature: mcp9808Temperature } = mcp9808(device, timings.default);

  const temperatureState = new ReadOnlyObservable(
    new MergedObservableGroup(null, [
      mcp9808Temperature.props.main.props.state,
      bme280Temperature.props.main.props.state,
    ]),
  );

  const temperature = new Element({
    $: 'temperature' as const,
    ...metricStaleness(temperatureState, timings.default[1]),
    bme280: bme280Temperature,
    level: Level.PROPERTY as const,
    main: getter(ValueType.NUMBER, temperatureState, 'deg-c'),
    mcp9808: mcp9808Temperature,
  });

  return new Element({
    ...ipDevice(device, persistence, timings),
    internal: {
      ...async(device, timings.slow || timings.default),
      ...mhz19(device, timings.slow || timings.default),
      ...sds011(device, timings.slow || timings.default),
      ...tsl2561(device, timings.default),
      ...uvIndex(device, timings.default),
      humidity,
      motion: input(device, undefined, 'motion'),
      pressure,
      temperature,
    },
  });
};
