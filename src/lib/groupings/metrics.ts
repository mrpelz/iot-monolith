/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { MultiValueSensor, SingleValueSensor } from '../items/sensor.js';
import { Async } from '../services/async.js';
import { Bme280 } from '../services/bme280.js';
import { BooleanState } from '../state.js';
import { Device } from '../device/main.js';
import { Hello } from '../services/hello.js';
import { Input } from '../events/input.js';
import { Mcp9808 } from '../services/mcp9808.js';
import { Mhz19 } from '../services/mhz19.js';
import { ReadOnlyObservable } from '../observable.js';
import { ScheduleEpochPair } from '../schedule.js';
import { Sds011 } from '../services/sds011.js';
import { SingleValueEvent } from '../items/event.js';
import { Timer } from '../timer.js';
import { Tsl2561 } from '../services/tsl2561.js';
import { VCC } from '../events/vcc.js';
import { Veml6070 } from '../services/veml6070.js';
import { epochs } from '../epochs.js';
import { metadataStore } from '../tree.js';

export type Timings = Record<string, ScheduleEpochPair | undefined> & {
  default: ScheduleEpochPair;
};

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

  const result = {
    _get: new ReadOnlyObservable(stale),
  };

  metadataStore.set(result, {
    metric: 'stale',
    type: 'boolean',
  });

  return {
    stale: result,
  };
}

export function async(device: Device, [schedule, epoch]: ScheduleEpochPair) {
  const { state } = new SingleValueSensor(
    device.addService(new Async()),
    schedule
  );

  const result = {
    _get: state,
    ...metricStaleness(state, epoch),
  };

  metadataStore.set(result, {
    metric: 'async',
    type: 'buffer',
  });

  return { async: result };
}

export function bme280(device: Device, [schedule, epoch]: ScheduleEpochPair) {
  const metrics = ['humidity', 'pressure', 'temperature'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Bme280()),
    metrics,
    schedule
  );

  return {
    humidity: (() => {
      const result = {
        _get: state.humidity,
        ...metricStaleness(state.humidity, epoch),
      };

      metadataStore.set(result, {
        metric: 'relativeHumidity',
        type: 'number',
        unit: 'percent',
      });

      return result;
    })(),
    pressure: (() => {
      const result = {
        _get: state.pressure,
        ...metricStaleness(state.pressure, epoch),
      };

      metadataStore.set(result, {
        metric: 'pressure',
        type: 'number',
        unit: 'pascal',
      });

      return result;
    })(),
    temperature: (() => {
      const result = {
        _get: state.temperature,
        ...metricStaleness(state.temperature, epoch),
      };

      metadataStore.set(result, {
        metric: 'temperature',
        type: 'number',
        unit: 'celsius',
      });

      return result;
    })(),
  };
}

export function hello(device: Device, [schedule, epoch]: ScheduleEpochPair) {
  const { state } = new SingleValueSensor(
    device.addService(new Hello()),
    schedule
  );

  const result = {
    _get: state,
    ...metricStaleness(state, epoch),
  };

  metadataStore.set(result, {
    metric: 'hello',
    type: 'string',
  });

  return { hello: result };
}

export function input(device: Device, index = 0) {
  const { state } = new SingleValueEvent(device.addEvent(new Input(index)));

  const result = {
    _get: state,
  };

  metadataStore.set(result, {
    metric: 'motion',
    type: 'null',
  });

  return result;
}

export function mcp9808(device: Device, [schedule, epoch]: ScheduleEpochPair) {
  const { state } = new SingleValueSensor(
    device.addService(new Mcp9808()),
    schedule
  );

  const result = {
    _get: state,
    ...metricStaleness(state, epoch),
  };

  metadataStore.set(result, {
    metric: 'temperature',
    type: 'number',
    unit: 'celsius',
  });

  return { temperature: result };
}

export function mhz19(device: Device, [schedule, epoch]: ScheduleEpochPair) {
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
    schedule
  );

  const result = {
    _get: state.co2,
    ...metricStaleness(state.co2, epoch),
    abc: (() => {
      const _abc = {
        _get: state.abc,
        ...metricStaleness(state.abc, epoch),
      };

      metadataStore.set(_abc, {
        metric: 'abc',
        type: 'boolean',
      });

      return _abc;
    })(),
    accuracy: (() => {
      const _accuracy = {
        _get: state.accuracy,
        ...metricStaleness(state.accuracy, epoch),
      };

      metadataStore.set(_accuracy, {
        metric: 'accuracy',
        unit: 'percent',
      });

      return _accuracy;
    })(),
    temperature: (() => {
      const _temperature = {
        _get: state.temperature,
        ...metricStaleness(state.temperature, epoch),
      };

      metadataStore.set(_temperature, {
        metric: 'temperature',
        unit: 'celsius',
      });

      return _temperature;
    })(),
    transmittance: (() => {
      const _transmittance = {
        _get: state.transmittance,
        ...metricStaleness(state.transmittance, epoch),
      };

      metadataStore.set(_transmittance, {
        metric: 'transmittance',
        unit: 'percent',
      });

      return _transmittance;
    })(),
  };

  metadataStore.set(result, {
    metric: 'co2',
    type: 'number',
    unit: 'ppm',
  });

  return { co2: result };
}

export function online(device: Device) {
  const result = {
    _get: device.isOnline,
  };

  metadataStore.set(result, {
    metric: 'isOnline',
    type: 'boolean',
  });

  return { online: result };
}

export function sds011(device: Device, [schedule, epoch]: ScheduleEpochPair) {
  const metrics = ['pm025', 'pm10'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Sds011()),
    metrics,
    schedule
  );

  return {
    pm025: (() => {
      const result = {
        _get: state.pm025,
        ...metricStaleness(state.pm025, epoch),
      };

      metadataStore.set(result, {
        metric: 'pm025',
        type: 'number',
        unit: 'ppm',
      });

      return result;
    })(),
    pm10: (() => {
      const result = {
        _get: state.pm10,
        ...metricStaleness(state.pm10, epoch),
      };

      metadataStore.set(result, {
        metric: 'pm10',
        type: 'number',
        unit: 'ppm',
      });

      return result;
    })(),
  };
}

export function tsl2561(device: Device, [schedule, epoch]: ScheduleEpochPair) {
  const { state } = new SingleValueSensor(
    device.addService(new Tsl2561()),
    schedule
  );

  const result = {
    _get: state,
    ...metricStaleness(state, epoch),
  };

  metadataStore.set(result, {
    metric: 'brightness',
    type: 'number',
    unit: 'lux',
  });

  return { brightness: result };
}

export function uvIndex(device: Device, [schedule, epoch]: ScheduleEpochPair) {
  const { state } = new SingleValueSensor(
    device.addService(new Veml6070()),
    schedule
  );

  const result = {
    _get: state,
    ...metricStaleness(state, epoch),
  };

  metadataStore.set(result, {
    metric: 'uvIndex',
    type: 'number',
  });

  return { uvIndex: result };
}

export function vcc(device: Device) {
  const { state } = new SingleValueEvent(device.addEvent(new VCC()));

  const result = {
    _get: state,
  };

  metadataStore.set(result, {
    metric: 'voltage',
    type: 'number',
    unit: 'volt',
  });

  return { vcc: result };
}
