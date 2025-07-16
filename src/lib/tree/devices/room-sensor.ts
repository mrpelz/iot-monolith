/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { ObservableGroup, ReadOnlyObservable } from '../../observable.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { getter } from '../elements/getter.js';
import { Level, ValueType } from '../main.js';
import {
  bme280 as bme280_,
  // input,
  mcp9808 as mcp9808_,
  metricStaleness,
  // mhz19,
  sgp30 as sgp30_,
  tsl2561 as tsl2561_,
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

  const bme280 = bme280_(context, device, timings.default);
  const { humidity, pressure, temperature: bme280Temperature } = bme280;

  const mcp9808 = mcp9808_(context, device, timings.default);
  const { temperature: mcp9808Temperature } = mcp9808;

  const temperatureState = new ReadOnlyObservable(
    new MergedObservableGroup(null, [
      mcp9808Temperature.state,
      bme280Temperature.state,
    ]),
  );

  const temperature = {
    $: 'temperature' as const,
    bme280: bme280Temperature,
    level: Level.PROPERTY as const,
    main: getter(ValueType.NUMBER, temperatureState, 'deg-c'),
    mcp9808: mcp9808Temperature,
    metricStaleness: metricStaleness(
      context,
      temperatureState,
      timings.default[1],
    ),
    state: temperatureState,
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

  const sgp30 = sgp30_(
    context,
    device,
    timings.slow || timings.default,
    sgp30MeasurementInputGetter,
  );
  const { tvoc } = sgp30;

  const tsl2561 = tsl2561_(context, device, timings.default);
  const { brightness } = tsl2561;

  return {
    $: 'roomSensor' as const,
    $noMainReference: true as const,
    brightness,
    device: ipDevice(context, device, false, undefined, initiallyOnline),
    humidity,
    // motion: input(device, undefined, 'motion'),
    pressure,
    sensors: {
      bme280,
      mcp9808,
      // ...mhz19(device, timings.slow || timings.default),
      // ...sds011(device, timings.slow || timings.default),
      sgp30,
      tsl2561,
    },
    temperature,
    tvoc,
  };
};
