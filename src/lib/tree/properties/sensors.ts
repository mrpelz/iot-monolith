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
import { Element, Level, ValueType } from '../main.js';
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
import { getter } from '../elements/getter.js';

export type Timings = Record<string, ScheduleEpochPair | undefined> & {
  default: ScheduleEpochPair;
};

export const lastChange = <T>(state: AnyReadOnlyObservable<T>) => {
  const seen = new Observable<number | null>(null);

  return {
    lastChange: new Element({
      $: 'lastChange' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, new ReadOnlyObservable(seen), 'date'),
    }),
  };
};

export const lastSeen = <T>(
  state: ReadOnlyObservable<T> | ReadOnlyNullState<T>
) => {
  const seen = new Observable<number | null>(null);

  return {
    lastSeen: new Element({
      $: 'lastSeen' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, new ReadOnlyObservable(seen), 'date'),
    }),
  };
};

export const metricStaleness = <T>(
  state: ReadOnlyObservable<T | null>,
  timeout: number
) => {
  const stale = new BooleanState(true);

  return {
    ...lastSeen(state),
    stale: new Element({
      $: 'metricStaleness' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.BOOLEAN, new ReadOnlyObservable(stale)),
    }),
  };
};

export const async = (device: Device, [schedule, epoch]: ScheduleEpochPair) => {
  const { state } = new SingleValueSensor(
    device.addService(new Async()),
    schedule
  );

  return new Element({
    $: 'async' as const,
    ...metricStaleness(state, epoch),
    level: Level.PROPERTY as const,
    main: getter(ValueType.RAW, state),
  });
};

export const bme280 = (
  device: Device,
  [schedule, epoch]: ScheduleEpochPair
) => {
  const { state } = new MultiValueSensor(
    device.addService(new Bme280()),
    ['humidity', 'pressure', 'temperature'] as const,
    schedule
  );

  return {
    humidity: new Element({
      $: 'bme280' as const,
      $$: 'humidity' as const,
      ...metricStaleness(state.humidity, epoch),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.humidity, 'percent-rh'),
    }),
    pressure: new Element({
      $: 'bme280' as const,
      $$: 'pressure' as const,
      ...metricStaleness(state.pressure, epoch),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.pressure, 'pa'),
    }),
    temperature: new Element({
      $: 'bme280' as const,
      $$: 'temperature' as const,
      ...metricStaleness(state.temperature, epoch),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
    }),
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
    tvoc: new Element({
      ...metricStaleness(state.tvoc, epoch),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.tvoc, 'ppb'),
      // eslint-disable-next-line sort-keys
      eco2: new Element({
        ...metricStaleness(state.eco2, epoch),
        level: Level.PROPERTY as const,
        main: getter(ValueType.NUMBER, state.eco2, 'ppm'),
      }),
      temperature: new Element({
        ...metricStaleness(state.temperature, epoch),
        level: Level.PROPERTY as const,
        main: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
      }),
    }),
  };
};

export const button = (device: Device, index = 0) => {
  const buttonEvent = device.addEvent(new ButtonEvent(index));

  return new Element({
    ...lastSeen(buttonEvent.observable),
    level: Level.PROPERTY as const,
    state: new Button(buttonEvent),
  });
};

export const hello = (device: Device, [schedule, epoch]: ScheduleEpochPair) => {
  const { state } = new SingleValueSensor(
    device.addService(new Hello()),
    schedule
  );

  return {
    hello: new Element({
      ...metricStaleness(state, epoch),
      level: Level.PROPERTY as const,
      main: getter(ValueType.STRING, state),
    }),
  };
};

export const input = <T extends string>(
  device: Device,
  index = 0,
  topic: T
) => {
  const { state } = new SingleValueEvent(device.addEvent(new Input(index)));

  return new Element({
    level: Level.PROPERTY as const,
    main: getter(ValueType.BOOLEAN, state),
    topic,
  });
};

export const inputGrouping = (...inputs: AnyObservable<boolean | null>[]) => {
  const state = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    inputs.map(
      (anInput) =>
        new ReadOnlyProxyObservable(anInput, (value) => Boolean(value))
    )
  );

  return new Element({
    level: Level.PROPERTY as const,
    main: getter(ValueType.BOOLEAN, new ReadOnlyObservable(state)),
  });
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
    temperature: new Element({
      ...metricStaleness(state, epoch),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state, 'deg-c'),
    }),
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
    co2: new Element({
      ...metricStaleness(state.co2, epoch),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.co2, 'ppm'),
      // eslint-disable-next-line sort-keys
      abc: new Element({
        ...metricStaleness(state.abc, epoch),
        main: getter(ValueType.BOOLEAN, state.abc),
      }),
      accuracy: new Element({
        ...metricStaleness(state.accuracy, epoch),
        main: getter(ValueType.NUMBER, state.accuracy, 'percent'),
      }),
      temperature: new Element({
        ...metricStaleness(state.temperature, epoch),
        main: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
      }),
      transmittance: new Element({
        ...metricStaleness(state.transmittance, epoch),
        main: getter(ValueType.NUMBER, state.transmittance, 'percent'),
      }),
    }),
  };
};

export const online = (device: Device) => ({
  online: new Element({
    ...lastChange(device.isOnline),
    level: Level.PROPERTY as const,
    main: getter(ValueType.BOOLEAN, device.isOnline),
  }),
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
    rfReadout: new Element({
      ...lastSeen(readOnlyState),
      level: Level.PROPERTY as const,
      main: getter(ValueType.RAW, readOnlyState),
    }),
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
      new Element({
        ...metricStaleness(state.pm025, epoch),
        level: Level.PROPERTY as const,
        main: getter(ValueType.NUMBER, state.pm025, 'micrograms/m3'),
      }))(),
    pm10: (() =>
      new Element({
        ...metricStaleness(state.pm10, epoch),
        level: Level.PROPERTY as const,
        main: getter(ValueType.NUMBER, state.pm10, 'micrograms/m3'),
      }))(),
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
    tvoc: new Element({
      ...metricStaleness(state.tvoc, epoch),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.tvoc, 'ppb'),
      // eslint-disable-next-line sort-keys
      eco2: new Element({
        ...metricStaleness(state.eco2, epoch),
        main: getter(ValueType.NUMBER, state.eco2, 'ppm'),
      }),
      ethanol: new Element({
        ...metricStaleness(state.ethanol, epoch),
        main: getter(ValueType.NUMBER, state.ethanol, 'ppm'),
      }),
      h2: new Element({
        ...metricStaleness(state.h2, epoch),
        main: getter(ValueType.NUMBER, state.h2, 'ppm'),
      }),
    }),
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
    brightness: new Element({
      ...metricStaleness(state, epoch),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state, 'lux'),
    }),
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
    uvIndex: new Element({
      ...metricStaleness(state, epoch),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state),
    }),
  };
};

export const vcc = (device: Device) => {
  const { state } = new SingleValueEvent(device.addEvent(new VCC()));

  return {
    vcc: new Element({
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state),
    }),
  };
};
