/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { ObservableGroup, ReadOnlyObservable } from '../../observable.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { getter } from '../elements/getter.js';
import { Level, ValueType } from '../main.js';
import {
  async,
  bme280,
  input,
  mcp9808,
  metricStaleness,
  mhz19,
  sds011,
  tsl2561,
  veml6070,
} from '../properties/sensors.js';

class MergedObservableGroup extends ObservableGroup<number | null> {
  protected _merge(): number | null {
    const validValues = this.values.filter(
      (value): value is number => typeof value === 'number',
    );

    return validValues.length > 0 ? Math.min(...validValues) : null;
  }
}

export const testDevice = (context: Context) => {
  const { connect, logger, timings } = context;

  const device = new UDPDevice(
    logger,
    'test-device.iot-ng.lan.wurstsalat.cloud',
    1337,
  );

  const {
    humidity,
    pressure,
    temperature: bme280Temperature,
  } = bme280(context, device, timings.default);

  const { temperature: mcp9808Temperature } = mcp9808(
    context,
    device,
    timings.default,
  );

  const temperatureState = new ReadOnlyObservable(
    new MergedObservableGroup(null, [
      mcp9808Temperature.main.state,
      bme280Temperature.main.state,
    ]),
  );

  const temperature = {
    $: 'temperature' as const,
    bme280: bme280Temperature,
    level: Level.PROPERTY as const,
    main: getter(ValueType.NUMBER, temperatureState, 'deg-c'),
    mcp9808: mcp9808Temperature,
    ...metricStaleness(context, temperatureState, timings.default[1]),
  };

  return {
    internal: {
      $exclude: true as const,
      $noMainReference: true as const,
      humidity,
      motion: input(context, device, undefined, 'motion'),
      pressure,
      temperature,
      ...async(context, device, timings.slow || timings.default),
      ...mhz19(context, device, timings.slow || timings.default),
      ...sds011(context, device, timings.slow || timings.default),
      ...tsl2561(context, device, timings.default),
      ...veml6070(context, device, timings.default),
    },
    ...ipDevice(context, device, false, undefined, connect),
  };
};
