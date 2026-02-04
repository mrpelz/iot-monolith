/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ObservableGroup, ReadOnlyObservable } from '@mrpelz/observable';

import { UDPDevice } from '../../device/udp.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { getter } from '../elements/getter.js';
import { Level, ValueType } from '../main.js';
import {
  async,
  bme280 as bme280_,
  input,
  mcp9808 as mcp9808_,
  metricStaleness,
  mhz19 as mhz19_,
  sds011 as sds011_,
  tsl2561 as tsl2561_,
  veml6070 as veml6070_,
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

  const mhz19 = mhz19_(context, device, timings.slow || timings.default);
  const { co2 } = mhz19;

  const sds011 = sds011_(context, device, timings.slow || timings.default);
  const { pm025, pm10 } = sds011;

  const tsl2561 = tsl2561_(context, device, timings.default);
  const { brightness } = tsl2561;

  const veml6070 = veml6070_(context, device, timings.default);
  const { uvIndex } = veml6070;

  return {
    $: 'testDevice' as const,
    $noMainReference: true as const,
    async: async(context, device, timings.slow || timings.default),
    brightness,
    co2,
    device: ipDevice(context, device, false, undefined, connect),
    humidity,
    motion: input(context, device, 0, 'motion'),
    pm025,
    pm10,
    pressure,
    sensors: {
      bme280,
      mcp9808,
      mhz19,
      sds011,
      tsl2561,
      veml6070,
    },
    temperature,
    uvIndex,
  };
};
