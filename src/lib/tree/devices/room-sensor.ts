/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { ObservableGroup, ReadOnlyObservable } from '../../observable.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { getter } from '../elements/getter.js';
import { Level, ValueType } from '../main.js';
import {
  bme280,
  // input,
  mcp9808,
  metricStaleness,
  // mhz19,
  sgp30,
  tsl2561,
} from '../properties/sensors.js';

class MergedObservableGroup extends ObservableGroup<number | null> {
  protected _merge(): number | null {
    const validValues = this.values.filter(
      (value): value is number => typeof value === 'number',
    );

    return validValues.length > 0 ? Math.min(...validValues) : null;
  }
}

export const roomSensor = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline = context.connect,
) => {
  const { logger, timings } = context;

  const device = new UDPDevice(logger, host, port);

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

  const sgp30MeasurementInputGetter = () => {
    const _humidity = humidity.main.state.value;
    const _temperature = temperatureState.value;

    if (_humidity === null || _temperature === null) return null;

    return {
      humidity: _humidity,
      temperature: _temperature,
    };
  };

  return {
    internal: {
      $noMainReference: true as const,
      humidity,
      // motion: input(device, undefined, 'motion'),
      pressure,
      temperature,
      // ...mhz19(device, timings.slow || timings.default),
      // ...sds011(device, timings.slow || timings.default),
      ...sgp30(
        context,
        device,
        timings.slow || timings.default,
        sgp30MeasurementInputGetter,
      ),
      ...tsl2561(context, device, timings.default),
    },
    ...ipDevice(context, device, false, undefined, initiallyOnline),
  };
};
