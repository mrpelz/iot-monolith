/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, ParentRelation, ValueType, metadataStore } from '../tree.js';
import { MultiValueSensor, SingleValueSensor } from '../items/sensor.js';
import { Observable, ReadOnlyObservable } from '../observable.js';
import { Async } from '../services/async.js';
import { Bme280 } from '../services/bme280.js';
import { BooleanState } from '../state.js';
import { Device } from '../device/main.js';
import { Hello } from '../services/hello.js';
import { Input } from '../events/input.js';
import { Mcp9808 } from '../services/mcp9808.js';
import { Mhz19 } from '../services/mhz19.js';
import { ScheduleEpochPair } from '../schedule.js';
import { Sds011 } from '../services/sds011.js';
import { SingleValueEvent } from '../items/event.js';
import { Timer } from '../timer.js';
import { Tsl2561 } from '../services/tsl2561.js';
import { VCC } from '../events/vcc.js';
import { Veml6070 } from '../services/veml6070.js';
import { epochs } from '../epochs.js';

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
    level: Levels.PROPERTY,
    parentRelation: ParentRelation.DATA_QUALIFIER,
    type: 'sensor',
    valueType: ValueType.BOOLEAN,
  });

  return {
    stale: result,
  };
}

export function lastSeen<T>(state: ReadOnlyObservable<T | null>) {
  const seen = new Observable<number | null>(null);

  state.observe((value) => {
    if (value === null) return;

    seen.value = Date.now();
  }, true);

  const result = {
    _get: new ReadOnlyObservable(seen),
  };

  metadataStore.set(result, {
    level: Levels.PROPERTY,
    parentRelation: ParentRelation.DATA_QUALIFIER,
    type: 'sensor',
    valueType: ValueType.NUMBER,
  });

  return {
    lastSeen: result,
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
    level: Levels.PROPERTY,
    measured: 'async',
    type: 'sensor',
    valueType: ValueType.RAW,
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
        level: Levels.PROPERTY,
        measured: 'relativeHumidity',
        type: 'sensor',
        unit: 'percent',
        valueType: ValueType.NUMBER,
      });

      return result;
    })(),
    pressure: (() => {
      const result = {
        _get: state.pressure,
        ...metricStaleness(state.pressure, epoch),
      };

      metadataStore.set(result, {
        level: Levels.PROPERTY,
        measured: 'pressure',
        type: 'sensor',
        unit: 'pascal',
        valueType: ValueType.NUMBER,
      });

      return result;
    })(),
    temperature: (() => {
      const result = {
        _get: state.temperature,
        ...metricStaleness(state.temperature, epoch),
      };

      metadataStore.set(result, {
        level: Levels.PROPERTY,
        measured: 'temperature',
        type: 'sensor',
        unit: 'celsius',
        valueType: ValueType.NUMBER,
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
    ...lastSeen(state),
  };

  metadataStore.set(result, {
    level: Levels.PROPERTY,
    measured: 'hello',
    type: 'sensor',
    valueType: ValueType.STRING,
  });

  return { hello: result };
}

export function input(device: Device, index = 0) {
  const { state } = new SingleValueEvent(device.addEvent(new Input(index)));

  const result = {
    _get: state,
  };

  metadataStore.set(result, {
    level: Levels.PROPERTY,
    measured: 'motion',
    type: 'sensor',
    valueType: ValueType.BOOLEAN,
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
    level: Levels.PROPERTY,
    measured: 'temperature',
    type: 'sensor',
    unit: 'celsius',
    valueType: ValueType.NUMBER,
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
        level: Levels.PROPERTY,
        measured: 'abc',
        parentRelation: ParentRelation.DATA_QUALIFIER,
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      });

      return _abc;
    })(),
    accuracy: (() => {
      const _accuracy = {
        _get: state.accuracy,
        ...metricStaleness(state.accuracy, epoch),
      };

      metadataStore.set(_accuracy, {
        level: Levels.PROPERTY,
        measured: 'accuracy',
        parentRelation: ParentRelation.DATA_QUALIFIER,
        type: 'sensor',
        unit: 'percent',
        valueType: ValueType.NUMBER,
      });

      return _accuracy;
    })(),
    temperature: (() => {
      const _temperature = {
        _get: state.temperature,
        ...metricStaleness(state.temperature, epoch),
      };

      metadataStore.set(_temperature, {
        level: Levels.PROPERTY,
        measured: 'temperature',
        parentRelation: ParentRelation.DATA_QUALIFIER,
        type: 'sensor',
        unit: 'celsius',
        valueType: ValueType.NUMBER,
      });

      return _temperature;
    })(),
    transmittance: (() => {
      const _transmittance = {
        _get: state.transmittance,
        ...metricStaleness(state.transmittance, epoch),
      };

      metadataStore.set(_transmittance, {
        level: Levels.PROPERTY,
        measured: 'transmittance',
        parentRelation: ParentRelation.DATA_QUALIFIER,
        type: 'sensor',
        unit: 'percent',
        valueType: ValueType.NUMBER,
      });

      return _transmittance;
    })(),
  };

  metadataStore.set(result, {
    level: Levels.PROPERTY,
    measured: 'co2',
    type: 'sensor',
    unit: 'ppm',
    valueType: ValueType.NUMBER,
  });

  return { co2: result };
}

export function online(device: Device) {
  const result = {
    _get: device.isOnline,
  };

  metadataStore.set(result, {
    level: Levels.PROPERTY,
    measured: 'isOnline',
    parentRelation: ParentRelation.META_RELATION,
    type: 'sensor',
    valueType: ValueType.BOOLEAN,
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
        level: Levels.PROPERTY,
        measured: 'pm025',
        type: 'sensor',
        unit: 'ppm',
        valueType: ValueType.NUMBER,
      });

      return result;
    })(),
    pm10: (() => {
      const result = {
        _get: state.pm10,
        ...metricStaleness(state.pm10, epoch),
      };

      metadataStore.set(result, {
        level: Levels.PROPERTY,
        measured: 'pm10',
        type: 'sensor',
        unit: 'ppm',
        valueType: ValueType.NUMBER,
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
    level: Levels.PROPERTY,
    measured: 'brightness',
    type: 'sensor',
    unit: 'lux',
    valueType: ValueType.NUMBER,
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
    level: Levels.PROPERTY,
    measured: 'uvIndex',
    type: 'sensor',
    valueType: ValueType.NUMBER,
  });

  return { uvIndex: result };
}

export function vcc(device: Device) {
  const { state } = new SingleValueEvent(device.addEvent(new VCC()));

  const result = {
    _get: state,
    ...lastSeen(state),
  };

  metadataStore.set(result, {
    level: Levels.PROPERTY,
    measured: 'voltage',
    parentRelation: ParentRelation.META_RELATION,
    type: 'sensor',
    unit: 'volt',
    valueType: ValueType.NUMBER,
  });

  return { vcc: result };
}
