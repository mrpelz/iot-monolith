/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  AnyObservable,
  AnyReadOnlyObservable,
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import {
  BooleanGroupStrategy,
  BooleanState,
  BooleanStateGroup,
  ReadOnlyNullState,
} from '../../state.js';
import { Ccs811, Ccs811Request } from '../../services/ccs811.js';
import { Levels, ParentRelation, ValueType, addMeta } from '../main.js';
import {
  MeasurementInputGetter,
  MultiValueSensor,
  SingleValueSensor,
} from '../../items/sensor.js';
import { Sgp30, Sgp30Request } from '../../services/sgp30.js';
import { Async } from '../../services/async.js';
import { Bme280 } from '../../services/bme280.js';
import { Button } from '../../items/button.js';
import { Button as ButtonEvent } from '../../events/button.js';
import { Device } from '../../device/main.js';
import { ESPNow } from '../../events/esp-now.js';
import { Hello } from '../../services/hello.js';
import { Input } from '../../events/input.js';
import { Mcp9808 } from '../../services/mcp9808.js';
import { Mhz19 } from '../../services/mhz19.js';
import { Rf433 } from '../../events/rf433.js';
import { ScheduleEpochPair } from '../../schedule.js';
import { Sds011 } from '../../services/sds011.js';
import { SingleValueEvent } from '../../items/event.js';
import { Timer } from '../../timer.js';
import { Tsl2561 } from '../../services/tsl2561.js';
import { VCC } from '../../events/vcc.js';
import { Veml6070 } from '../../services/veml6070.js';
import { byteLengthAddress } from '../../device/ev1527.js';
import { epochs } from '../../epochs.js';

export type Timings = Record<string, ScheduleEpochPair | undefined> & {
  default: ScheduleEpochPair;
};

export const lastChange = <T>(state: AnyReadOnlyObservable<T>) => {
  const seen = new Observable<number | null>(null);

  state.observe((value) => {
    if (value === null) return;

    seen.value = Date.now();
  });

  return {
    lastChange: addMeta(
      { _get: new ReadOnlyObservable(seen) },
      {
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.META_RELATION,
        type: 'sensor',
        unit: 'date',
        valueType: ValueType.NUMBER,
      }
    ),
  };
};

export const lastSeen = <T>(
  state: ReadOnlyObservable<T> | ReadOnlyNullState<T>
) => {
  const seen = new Observable<number | null>(null);

  state.observe((value) => {
    if (state instanceof ReadOnlyObservable && value === null) return;

    seen.value = Date.now();
  }, true);

  return {
    lastSeen: addMeta(
      { _get: new ReadOnlyObservable(seen) },
      {
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.META_RELATION,
        type: 'sensor',
        unit: 'date',
        valueType: ValueType.NUMBER,
      }
    ),
  };
};

export const metricStaleness = <T>(
  state: ReadOnlyObservable<T | null>,
  timeout: number
) => {
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
    stale: addMeta(
      { _get: new ReadOnlyObservable(stale) },
      {
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.DATA_QUALIFIER,
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      }
    ),
    ...lastSeen(state),
  };
};

export const async = (device: Device, [schedule, epoch]: ScheduleEpochPair) => {
  const { state } = new SingleValueSensor(
    device.addService(new Async()),
    schedule
  );

  return {
    async: addMeta(
      {
        _get: state,
        ...metricStaleness(state, epoch),
      },
      {
        level: Levels.PROPERTY,
        measured: 'async',
        type: 'sensor',
        valueType: ValueType.RAW,
      }
    ),
  };
};

export const bme280 = (
  device: Device,
  [schedule, epoch]: ScheduleEpochPair
) => {
  const metrics = ['humidity', 'pressure', 'temperature'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Bme280()),
    metrics,
    schedule
  );

  return {
    humidity: (() =>
      addMeta(
        {
          _get: state.humidity,
          ...metricStaleness(state.humidity, epoch),
        },
        {
          level: Levels.PROPERTY,
          measured: 'relativeHumidity',
          type: 'sensor',
          unit: 'percent-rh',
          valueType: ValueType.NUMBER,
        }
      ))(),
    pressure: (() =>
      addMeta(
        {
          _get: state.pressure,
          ...metricStaleness(state.pressure, epoch),
        },
        {
          level: Levels.PROPERTY,
          measured: 'pressure',
          type: 'sensor',
          unit: 'pa',
          valueType: ValueType.NUMBER,
        }
      ))(),
    temperature: (() =>
      addMeta(
        {
          _get: state.temperature,
          ...metricStaleness(state.temperature, epoch),
        },
        {
          level: Levels.PROPERTY,
          measured: 'temperature',
          type: 'sensor',
          unit: 'deg-c',
          valueType: ValueType.NUMBER,
        }
      ))(),
  };
};

export const ccs811 = (
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
  measurementInputGetter: MeasurementInputGetter<Ccs811Request>
) => {
  const metrics = ['eco2', 'temperature', 'tvoc'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Ccs811()),
    metrics,
    schedule,
    measurementInputGetter
  );

  return {
    tvoc: addMeta(
      {
        _get: state.tvoc,
        ...metricStaleness(state.tvoc, epoch),
        eco2: (() =>
          addMeta(
            {
              _get: state.eco2,
              ...metricStaleness(state.eco2, epoch),
            },
            {
              level: Levels.PROPERTY,
              measured: 'eco2',
              parentRelation: ParentRelation.DATA_QUALIFIER,
              type: 'sensor',
              unit: 'ppm',
              valueType: ValueType.NUMBER,
            }
          ))(),
        temperature: (() =>
          addMeta(
            {
              _get: state.temperature,
              ...metricStaleness(state.temperature, epoch),
            },
            {
              level: Levels.PROPERTY,
              measured: 'temperature',
              parentRelation: ParentRelation.DATA_QUALIFIER,
              type: 'sensor',
              unit: 'deg-c',
              valueType: ValueType.NUMBER,
            }
          ))(),
      },
      {
        level: Levels.PROPERTY,
        measured: 'tvoc',
        type: 'sensor',
        unit: 'ppb',
        valueType: ValueType.NUMBER,
      }
    ),
  };
};

export const button = (device: Device, index = 0) => {
  const buttonEvent = new ButtonEvent(index);
  device.addEvent(buttonEvent);

  return {
    $: new Button(buttonEvent),
    ...lastSeen(buttonEvent.observable),
  };
};

export const hello = (device: Device, [schedule, epoch]: ScheduleEpochPair) => {
  const { state } = new SingleValueSensor(
    device.addService(new Hello()),
    schedule
  );

  return {
    hello: addMeta(
      {
        _get: state,
        ...metricStaleness(state, epoch),
      },
      {
        level: Levels.PROPERTY,
        measured: 'hello',
        type: 'sensor',
        valueType: ValueType.STRING,
      }
    ),
  };
};

export const input = (device: Device, index = 0, measured: string) => {
  const { state } = new SingleValueEvent(device.addEvent(new Input(index)));

  return addMeta(
    { _get: state },
    {
      level: Levels.PROPERTY,
      measured,
      type: 'sensor',
      valueType: ValueType.BOOLEAN,
    }
  );
};

export const inputGrouping = (...inputs: AnyObservable<boolean | null>[]) => {
  const state = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    inputs.map(
      (anInput) =>
        new ReadOnlyProxyObservable(anInput, (value) => Boolean(value))
    )
  );

  return addMeta(
    { _get: new ReadOnlyObservable(state) },
    {
      level: Levels.PROPERTY,
      type: 'sensor',
      valueType: ValueType.BOOLEAN,
    }
  );
};

export const mcp9808 = (
  device: Device,
  [schedule, epoch]: ScheduleEpochPair
) => {
  const { state } = new SingleValueSensor(
    device.addService(new Mcp9808()),
    schedule
  );

  return {
    temperature: addMeta(
      {
        _get: state,
        ...metricStaleness(state, epoch),
      },
      {
        level: Levels.PROPERTY,
        measured: 'temperature',
        type: 'sensor',
        unit: 'deg-c',
        valueType: ValueType.NUMBER,
      }
    ),
  };
};

export const mhz19 = (device: Device, [schedule, epoch]: ScheduleEpochPair) => {
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

  return {
    co2: addMeta(
      {
        _get: state.co2,
        ...metricStaleness(state.co2, epoch),
        abc: (() =>
          addMeta(
            {
              _get: state.abc,
              ...metricStaleness(state.abc, epoch),
            },
            {
              level: Levels.PROPERTY,
              measured: 'abc',
              parentRelation: ParentRelation.DATA_QUALIFIER,
              type: 'sensor',
              valueType: ValueType.BOOLEAN,
            }
          ))(),
        accuracy: (() =>
          addMeta(
            {
              _get: state.accuracy,
              ...metricStaleness(state.accuracy, epoch),
            },
            {
              level: Levels.PROPERTY,
              measured: 'accuracy',
              parentRelation: ParentRelation.DATA_QUALIFIER,
              type: 'sensor',
              unit: 'percent',
              valueType: ValueType.NUMBER,
            }
          ))(),
        temperature: (() =>
          addMeta(
            {
              _get: state.temperature,
              ...metricStaleness(state.temperature, epoch),
            },
            {
              level: Levels.PROPERTY,
              measured: 'temperature',
              parentRelation: ParentRelation.DATA_QUALIFIER,
              type: 'sensor',
              unit: 'deg-c',
              valueType: ValueType.NUMBER,
            }
          ))(),
        transmittance: (() =>
          addMeta(
            {
              _get: state.transmittance,
              ...metricStaleness(state.transmittance, epoch),
            },
            {
              level: Levels.PROPERTY,
              measured: 'transmittance',
              parentRelation: ParentRelation.DATA_QUALIFIER,
              type: 'sensor',
              unit: 'percent',
              valueType: ValueType.NUMBER,
            }
          ))(),
      },
      {
        level: Levels.PROPERTY,
        measured: 'co2',
        type: 'sensor',
        unit: 'ppm',
        valueType: ValueType.NUMBER,
      }
    ),
  };
};

export const online = (device: Device) => ({
  online: addMeta(
    {
      _get: device.isOnline,
      ...lastChange(device.isOnline),
    },
    {
      level: Levels.PROPERTY,
      measured: 'isOnline',
      parentRelation: ParentRelation.META_RELATION,
      type: 'sensor',
      valueType: ValueType.BOOLEAN,
    }
  ),
});

export const rfReadout = (espNowEvent: ESPNow, rf433Event: Rf433) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = new Observable<any>({});

  espNowEvent.observable.observe(({ deviceIdentifier, data }) => {
    state.value = {
      ...state.value,
      espNow: {
        data: [...data],
        macAddress: [...deviceIdentifier]
          .map((octet) => octet.toString(16).padStart(2, '0'))
          .join(':'),
      },
    };
  });

  rf433Event.observable.observe(
    ({ data, deviceIdentifier, protocol, value }) => {
      state.value = {
        ...state.value,
        rf433: {
          data: `0b${[...data]
            .reverse()
            .map((byte) => byte.toString(2).padStart(8, '0'))
            .join('')}`,
          deviceIdentifier: deviceIdentifier.readUIntBE(0, byteLengthAddress),
          protocol,
          value: `0b${[...value]
            .reverse()
            .map((byte) => byte.toString(2).padStart(8, '0'))
            .join('')}`,
        },
      };
    }
  );

  const readOnlyState = new ReadOnlyObservable(state);

  return {
    rfReadout: addMeta(
      {
        _get: readOnlyState,
        ...lastSeen(readOnlyState),
      },
      {
        level: Levels.PROPERTY,
        measured: 'rfReadout',
        type: 'sensor',
        valueType: ValueType.RAW,
      }
    ),
  };
};

export const sds011 = (
  device: Device,
  [schedule, epoch]: ScheduleEpochPair
) => {
  const metrics = ['pm025', 'pm10'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Sds011()),
    metrics,
    schedule
  );

  return {
    pm025: (() =>
      addMeta(
        {
          _get: state.pm025,
          ...metricStaleness(state.pm025, epoch),
        },
        {
          level: Levels.PROPERTY,
          measured: 'pm025',
          type: 'sensor',
          unit: 'micrograms/m3',
          valueType: ValueType.NUMBER,
        }
      ))(),
    pm10: (() =>
      addMeta(
        {
          _get: state.pm10,
          ...metricStaleness(state.pm10, epoch),
        },
        {
          level: Levels.PROPERTY,
          measured: 'pm10',
          type: 'sensor',
          unit: 'micrograms/m3',
          valueType: ValueType.NUMBER,
        }
      ))(),
  };
};

export const sgp30 = (
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
  measurementInputGetter: MeasurementInputGetter<Sgp30Request>
) => {
  const metrics = ['eco2', 'ethanol', 'h2', 'tvoc'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Sgp30()),
    metrics,
    schedule,
    measurementInputGetter
  );

  return {
    tvoc: addMeta(
      {
        _get: state.tvoc,
        ...metricStaleness(state.tvoc, epoch),
        eco2: (() =>
          addMeta(
            {
              _get: state.eco2,
              ...metricStaleness(state.eco2, epoch),
            },
            {
              level: Levels.PROPERTY,
              measured: 'eco2',
              parentRelation: ParentRelation.DATA_QUALIFIER,
              type: 'sensor',
              unit: 'ppm',
              valueType: ValueType.NUMBER,
            }
          ))(),
        ethanol: (() =>
          addMeta(
            {
              _get: state.ethanol,
              ...metricStaleness(state.ethanol, epoch),
            },
            {
              level: Levels.PROPERTY,
              measured: 'ethanol',
              parentRelation: ParentRelation.DATA_QUALIFIER,
              type: 'sensor',
              unit: 'ppm',
              valueType: ValueType.NUMBER,
            }
          ))(),
        h2: (() =>
          addMeta(
            {
              _get: state.h2,
              ...metricStaleness(state.h2, epoch),
            },
            {
              level: Levels.PROPERTY,
              measured: 'h2',
              parentRelation: ParentRelation.DATA_QUALIFIER,
              type: 'sensor',
              unit: 'ppm',
              valueType: ValueType.NUMBER,
            }
          ))(),
      },
      {
        level: Levels.PROPERTY,
        measured: 'tvoc',
        type: 'sensor',
        unit: 'ppb',
        valueType: ValueType.NUMBER,
      }
    ),
  };
};

export const tsl2561 = (
  device: Device,
  [schedule, epoch]: ScheduleEpochPair
) => {
  const { state } = new SingleValueSensor(
    device.addService(new Tsl2561()),
    schedule
  );

  return {
    brightness: addMeta(
      {
        _get: state,
        ...metricStaleness(state, epoch),
      },
      {
        level: Levels.PROPERTY,
        measured: 'brightness',
        type: 'sensor',
        unit: 'lux',
        valueType: ValueType.NUMBER,
      }
    ),
  };
};

export const uvIndex = (
  device: Device,
  [schedule, epoch]: ScheduleEpochPair
) => {
  const { state } = new SingleValueSensor(
    device.addService(new Veml6070()),
    schedule
  );

  return {
    uvIndex: addMeta(
      {
        _get: state,
        ...metricStaleness(state, epoch),
      },
      {
        level: Levels.PROPERTY,
        measured: 'uvIndex',
        type: 'sensor',
        valueType: ValueType.NUMBER,
      }
    ),
  };
};

export const vcc = (device: Device) => {
  const { state } = new SingleValueEvent(device.addEvent(new VCC()));

  return {
    vcc: addMeta(
      { _get: state },
      {
        level: Levels.PROPERTY,
        measured: 'voltage',
        parentRelation: ParentRelation.META_RELATION,
        type: 'sensor',
        valueType: ValueType.NUMBER,
      }
    ),
  };
};
