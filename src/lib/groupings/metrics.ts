/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { MultiValueSensor, SingleValueSensor } from '../items/sensor.js';
import {
  every2Minutes,
  every30Seconds,
  every5Seconds,
} from '../../app/timings.js';
import { Async } from '../services/async.js';
import { Bme280 } from '../services/bme280.js';
import { BooleanState } from '../state.js';
import { Device } from '../device/main.js';
import { Hello } from '../services/hello.js';
import { Input } from '../events/input.js';
import { Mcp9808 } from '../services/mcp9808.js';
import { Meta } from '../hierarchy.js';
import { Mhz19 } from '../services/mhz19.js';
import { ReadOnlyObservable } from '../observable.js';
import { Sds011 } from '../services/sds011.js';
import { SingleValueEvent } from '../items/event.js';
import { Timer } from '../timer.js';
import { Tsl2561 } from '../services/tsl2561.js';
import { VCC } from '../events/vcc.js';
import { Veml6070 } from '../services/veml6070.js';
import { epochs } from '../epochs.js';

function metricStaleness<T>(
  state: ReadOnlyObservable<T | null>,
  timeout: number
) {
  const stale = new BooleanState(true);

  const timer = new Timer(timeout + epochs.second * 10);
  timer.observe(() => {
    stale.value = true;
  });

  state.observe((value) => {
    stale.value = value === null;
    timer.start();
  }, true);

  return {
    stale: {
      meta: <Meta>{
        type: 'boolean',
      },
      state: new ReadOnlyObservable(stale),
    },
  };
}

export function async(device: Device) {
  const { state } = new SingleValueSensor(
    device.addService(new Async()),
    every2Minutes
  );

  return {
    async: {
      meta: <Meta>{
        metric: 'async',
        type: 'buffer',
      },
      nodes: metricStaleness(state, epochs.minute * 2),
      state,
    },
  };
}

export function bme280(device: Device) {
  const metrics = ['humidity', 'pressure', 'temperature'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Bme280()),
    metrics,
    every5Seconds
  );

  return {
    humidity: {
      meta: <Meta>{
        metric: 'relativeHumidity',
        type: 'number',
        unit: 'percent',
      },
      nodes: metricStaleness(state.humidity, epochs.second * 5),
      state: state.humidity,
    },
    pressure: {
      meta: <Meta>{
        metric: 'pressure',
        type: 'number',
        unit: 'pascal',
      },
      nodes: metricStaleness(state.pressure, epochs.second * 5),
      state: state.pressure,
    },
    temperature: {
      meta: <Meta>{
        metric: 'temperature',
        type: 'number',
        unit: 'celsius',
      },
      nodes: metricStaleness(state.temperature, epochs.second * 5),
      state: state.temperature,
    },
  };
}

export function hello(device: Device) {
  const { state } = new SingleValueSensor(
    device.addService(new Hello()),
    every30Seconds
  );

  return {
    hello: {
      meta: <Meta>{
        metric: 'hello',
        type: 'string',
      },
      nodes: metricStaleness(state, epochs.second * 30),
      state,
    },
  };
}

export function input(device: Device, index = 0) {
  const { state } = new SingleValueEvent(device.addEvent(new Input(index)));

  return {
    meta: <Meta>{
      metric: 'motion',
      type: 'null',
    },
    state,
  };
}

export function mcp9808(device: Device) {
  const { state } = new SingleValueSensor(
    device.addService(new Mcp9808()),
    every5Seconds
  );

  return {
    temperature: {
      meta: <Meta>{
        metric: 'temperature',
        type: 'number',
        unit: 'celsius',
      },
      nodes: metricStaleness(state, epochs.second * 5),
      state,
    },
  };
}

export function mhz19(device: Device) {
  const metrics = [
    'abc',
    'accuracy',
    'co2',
    'temperature',
    'transmittance',
  ] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Mhz19()),
    metrics,
    every2Minutes
  );

  return {
    co2: {
      meta: <Meta>{
        metric: 'co2',
        type: 'number',
        unit: 'ppm',
      },
      nodes: {
        ...metricStaleness(state.co2, epochs.minute * 2),
        abc: {
          meta: <Meta>{
            metric: 'abc',
            type: 'boolean',
          },
          nodes: metricStaleness(state.abc, epochs.minute * 2),
          state: state.abc,
        },
        accuracy: {
          meta: <Meta>{
            metric: 'accuracy',
            unit: 'percent',
          },
          nodes: metricStaleness(state.accuracy, epochs.minute * 2),
          state: state.accuracy,
        },
        temperature: {
          meta: <Meta>{
            metric: 'temperature',
            unit: 'celsius',
          },
          nodes: metricStaleness(state.temperature, epochs.minute * 2),
          state: state.temperature,
        },
        transmittance: {
          meta: <Meta>{
            metric: 'transmittance',
            unit: 'percent',
          },
          nodes: metricStaleness(state.transmittance, epochs.minute * 2),
          state: state.transmittance,
        },
      },
      state: state.co2,
    },
  };
}

export function online(device: Device) {
  return {
    online: {
      meta: <Meta>{
        metric: 'isOnline',
        type: 'boolean',
      },
      state: device.isOnline,
    },
  };
}

export function sds011(device: Device) {
  const metrics = ['pm025', 'pm10'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Sds011()),
    metrics,
    every2Minutes
  );

  return {
    pm025: {
      meta: <Meta>{
        metric: 'pm025',
        type: 'number',
        unit: 'ppm',
      },
      nodes: metricStaleness(state.pm025, epochs.minute * 2),
      state: state.pm025,
    },
    pm10: {
      meta: <Meta>{
        metric: 'pm10',
        type: 'number',
        unit: 'ppm',
      },
      nodes: metricStaleness(state.pm10, epochs.minute * 2),
      state: state.pm10,
    },
  };
}

export function tsl2561(device: Device) {
  const { state } = new SingleValueSensor(
    device.addService(new Tsl2561()),
    every5Seconds
  );

  return {
    brightness: {
      meta: <Meta>{
        metric: 'brightness',
        type: 'number',
        unit: 'lux',
      },
      nodes: metricStaleness(state, epochs.second * 5),
      state,
    },
  };
}

export function uvIndex(device: Device) {
  const { state } = new SingleValueSensor(
    device.addService(new Veml6070()),
    every5Seconds
  );

  return {
    uvIndex: {
      meta: <Meta>{
        metric: 'uvIndex',
        type: 'number',
      },
      nodes: metricStaleness(state, epochs.second * 5),
      state,
    },
  };
}

export function vcc(device: Device) {
  const { state } = new SingleValueEvent(device.addEvent(new VCC()));

  return {
    vcc: {
      meta: <Meta>{
        metric: 'voltage',
        type: 'number',
        unit: 'volt',
      },
      state,
    },
  };
}
