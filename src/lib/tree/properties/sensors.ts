/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { epochs } from '@mrpelz/modifiable-date';
import {
  AnyObservable,
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '@mrpelz/observable';
import {
  AnyNullState,
  BooleanGroupStrategy,
  BooleanState,
  BooleanStateGroup,
  ReadOnlyNullState,
} from '@mrpelz/observable/state';
import { Timer } from '@mrpelz/observable/timer';

import { byteLengthAddress } from '../../device/ev1527.js';
import { Device } from '../../device/main.js';
import { Button as ButtonEvent } from '../../events/button.js';
import { ESPNow } from '../../events/esp-now.js';
import { Input } from '../../events/input.js';
import { Rf433 } from '../../events/rf433.js';
import { VCC } from '../../events/vcc.js';
import { Button } from '../../items/button.js';
import { SingleValueEvent } from '../../items/event.js';
import {
  MeasurementInputGetter,
  MultiValueSensor,
  SingleValueSensor,
} from '../../items/sensor.js';
import { ScheduleEpochPair } from '../../schedule.js';
import { Async } from '../../services/async.js';
import { Bme280 } from '../../services/bme280.js';
import { Ccs811, Ccs811Request } from '../../services/ccs811.js';
import { Hello } from '../../services/hello.js';
import { Mcp9808 } from '../../services/mcp9808.js';
import { Mhz19 } from '../../services/mhz19.js';
import { Sds011 } from '../../services/sds011.js';
import { Sgp30, Sgp30Request } from '../../services/sgp30.js';
import { Tsl2561 } from '../../services/tsl2561.js';
import { Veml6070 } from '../../services/veml6070.js';
import { Context } from '../context.js';
import { ev1527MotionSensor } from '../devices/ev1527-motion-sensor.js';
import { ev1527WindowSensor } from '../devices/ev1527-window-sensor.js';
import { getter } from '../elements/getter.js';
import { Level, ValueType } from '../main.js';
import { InitFunction } from '../operations/init.js';

export type Timings = Record<string, ScheduleEpochPair | undefined> & {
  default: ScheduleEpochPair;
};

export const lastChange = <T>(_: Context, state: AnyObservable<T>) => {
  const $ = 'lastChange' as const;

  const changed_ = new Observable<number | null>(null);
  const changed = new ReadOnlyObservable(changed_);

  const $init: InitFunction = () => {
    state.observe((value) => {
      if (value === null) return;

      changed_.value = Date.now();
    });
  };

  return {
    $,
    $init,
    level: Level.PROPERTY as const,
    main: getter(ValueType.NUMBER, changed, 'date'),
    state: changed,
  };
};

export const lastSeen = <T>(
  _: Context,
  state: AnyObservable<T> | AnyNullState<T>,
) => {
  const $ = 'lastSeen' as const;

  const seen_ = new Observable<number | null>(null);
  const seen = new ReadOnlyObservable(seen_);

  const $init: InitFunction = () => {
    state.observe((value) => {
      if (state instanceof ReadOnlyObservable && value === null) return;

      seen_.value = Date.now();
    }, true);
  };

  return {
    $,
    $init,
    level: Level.PROPERTY as const,
    main: getter(ValueType.NUMBER, seen, 'date'),
    state: seen,
  };
};

export const metricStaleness = <T>(
  context: Context,
  state: ReadOnlyObservable<T | null>,
  timeout: number,
) => {
  const $ = 'metricStaleness' as const;

  const stale_ = new BooleanState(true);
  const stale = new ReadOnlyObservable(stale_);

  const $init: InitFunction = () => {
    const timer = new Timer(timeout + epochs.second * 10);
    timer.observe(() => {
      stale_.value = true;
    });

    state.observe((value) => {
      stale_.value = value === null;
      timer.start();
    }, true);
  };

  return {
    $,
    $init,
    lastChange: lastChange(context, state),
    lastSeen: lastSeen(context, state),
    level: Level.PROPERTY as const,
    main: getter(ValueType.BOOLEAN, stale),
    state: stale,
  };
};

export const async = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const { state } = new SingleValueSensor(
    device.addService(new Async()),
    schedule,
  );

  return {
    $: 'async' as const,
    level: Level.PROPERTY as const,
    main: getter(ValueType.RAW, state),
    metricStaleness: metricStaleness(context, state, epoch),
    state,
  };
};

export const bme280 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const $ = 'bme280' as const;

  const metrics = ['humidity', 'pressure', 'temperature'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Bme280()),
    metrics,
    schedule,
  );

  return {
    $,
    humidity: {
      $: 'humidity' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.humidity, 'percent-rh'),
      metricStaleness: metricStaleness(context, state.humidity, epoch),
      state: state.humidity,
    },
    pressure: {
      $: 'pressure' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.pressure, 'pa'),
      metricStaleness: metricStaleness(context, state.pressure, epoch),
      state: state.pressure,
    },
    temperature: {
      $: 'temperature' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
      metricStaleness: metricStaleness(context, state.temperature, epoch),
      state: state.temperature,
    },
  };
};

export const ccs811 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
  measurementInputGetter: MeasurementInputGetter<Ccs811Request>,
) => {
  const $ = 'ccs811' as const;

  const metrics = ['eco2', 'temperature', 'tvoc'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Ccs811()),
    metrics,
    schedule,
    measurementInputGetter,
  );

  return {
    $,
    tvoc: {
      $: 'tvoc' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.tvoc, 'ppb'),
      state: state.tvoc,
      // eslint-disable-next-line sort-keys
      eco2: {
        level: Level.PROPERTY as const,
        main: getter(ValueType.NUMBER, state.eco2, 'ppm'),
        metricStaleness: metricStaleness(context, state.eco2, epoch),
        state: state.eco2,
      },
      metricStaleness: metricStaleness(context, state.tvoc, epoch),
      temperature: {
        level: Level.PROPERTY as const,
        main: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
        metricStaleness: metricStaleness(context, state.temperature, epoch),
        state: state.temperature,
      },
    },
  };
};

export const button = (context: Context, device: Device, index = 0) => {
  const buttonEvent = device.addEvent(new ButtonEvent(index));

  return {
    $: 'button' as const,
    lastSeen: lastSeen(context, buttonEvent.observable),
    level: Level.PROPERTY as const,
    state: new Button(buttonEvent),
  };
};

export const buttonPrimitive = (
  context: Context,
  state: ReadOnlyNullState<unknown>,
) => ({
  $: 'buttonPrimitive' as const,
  lastSeen: lastSeen(context, state),
  level: Level.PROPERTY as const,
  state,
});

export const door = <T extends string | undefined>(
  _: Context,
  sensor: ReturnType<typeof ev1527WindowSensor>,
  topic: T,
) => {
  const $ = 'door' as const;

  const { open } = sensor;

  return {
    $,
    level: Level.PROPERTY as const,
    open,
    topic,
  };
};

export const hello = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const $ = 'hello' as const;

  const { state } = new SingleValueSensor(
    device.addService(new Hello()),
    schedule,
  );

  return {
    $,
    level: Level.PROPERTY as const,
    main: getter(ValueType.STRING, state),
    metricStaleness: metricStaleness(context, state, epoch),
    state,
  };
};

export const input = <T extends string | undefined>(
  context: Context,
  device: Device,
  index = 0,
  topic: T,
) => {
  const $ = 'input' as const;

  const { state } = new SingleValueEvent(device.addEvent(new Input(index)));

  return {
    $,
    lastChange: lastChange(context, state),
    lastSeen: lastSeen(context, state),
    level: Level.PROPERTY as const,
    main: getter(ValueType.BOOLEAN, state),
    state,
    topic,
  };
};

export const inputGrouping = <T extends string | undefined>(
  context: Context,
  inputs: (
    | ReturnType<typeof input>
    | ReturnType<typeof door>
    | ReturnType<typeof window>
  )[],
  topic: T,
) => {
  const $ = 'inputGrouping' as const;

  const inputs_ = Array.from(new Set(inputs));

  const state_ = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    inputs_.map(
      (anInput) =>
        new ReadOnlyProxyObservable(
          anInput.$ === 'input' ? anInput.main.state : anInput.open.main.state,
          (value) => Boolean(value),
        ),
    ),
  );

  const state = new ReadOnlyObservable(state_);

  return {
    $,
    $noMainReference: true as const,
    inputs: inputs_,
    lastChange: lastChange(context, state),
    lastSeen: lastSeen(context, state),
    level: Level.PROPERTY as const,
    main: getter(ValueType.BOOLEAN, new ReadOnlyObservable(state)),
    state,
    topic,
  };
};

export const mcp9808 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const $ = 'mcp9808' as const;

  const { state } = new SingleValueSensor(
    device.addService(new Mcp9808()),
    schedule,
  );

  return {
    $,
    temperature: {
      $: 'temperature' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state, 'deg-c'),
      metricStaleness: metricStaleness(context, state, epoch),
      state,
    },
  };
};

export const mhz19 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const $ = 'mhz19' as const;

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
    schedule,
  );

  return {
    $,
    co2: {
      $: 'co2' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.co2, 'ppm'),
      state: state.co2,
      // eslint-disable-next-line sort-keys
      abc: {
        main: getter(ValueType.BOOLEAN, state.abc),
        metricStaleness: metricStaleness(context, state.abc, epoch),
        state: state.abc,
      },
      accuracy: {
        main: getter(ValueType.NUMBER, state.accuracy, 'percent'),
        metricStaleness: metricStaleness(context, state.accuracy, epoch),
        state: state.accuracy,
      },
      metricStaleness: metricStaleness(context, state.co2, epoch),
      temperature: {
        main: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
        metricStaleness: metricStaleness(context, state.temperature, epoch),
        state: state.temperature,
      },
      transmittance: {
        main: getter(ValueType.NUMBER, state.transmittance, 'percent'),
        metricStaleness: metricStaleness(context, state.transmittance, epoch),
        state: state.transmittance,
      },
    },
  };
};

export const motion = <T extends string | undefined>(
  context: Context,
  sensor: ReturnType<typeof ev1527MotionSensor>,
  topic: T,
  cooloffTime = 10_000,
) => {
  const $ = 'motion' as const;

  const { state: emitter } = sensor;

  const state_ = new BooleanState(false);

  const timer = new Timer(cooloffTime);
  emitter.observe((value) => {
    state_.value = value ?? false;
    if (!value) return;

    timer.start();
  });
  timer.observe(() => (state_.value = false));

  const state = new ReadOnlyObservable(state_);

  return {
    $,
    lastChange: lastChange(context, state),
    lastSeen: lastSeen(context, state),
    level: Level.PROPERTY as const,
    main: getter(ValueType.BOOLEAN, state),
    state,
    topic,
  };
};

export const rfReadout = (
  context: Context,
  espNowEvent: ESPNow,
  rf433Event: Rf433,
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state_ = new Observable<any>({});
  const state = new ReadOnlyObservable(state_);

  espNowEvent.observable.observe(({ deviceIdentifier, data }) => {
    state_.value = {
      ...state_.value,
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
      state_.value = {
        ...state_.value,
        rf433: {
          data: `0b${[...data]
            .toReversed()
            .map((byte) => byte.toString(2).padStart(8, '0'))
            .join('')}`,
          deviceIdentifier: deviceIdentifier.readUIntBE(0, byteLengthAddress),
          protocol,
          value: `0b${[...value]
            .toReversed()
            .map((byte) => byte.toString(2).padStart(8, '0'))
            .join('')}`,
        },
      };
    },
  );

  return {
    $: 'rfReadout' as const,
    lastChange: lastChange(context, state),
    lastSeen: lastSeen(context, state),
    level: Level.PROPERTY as const,
    main: getter(ValueType.RAW, state),
    state,
  };
};

export const sds011 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const $ = 'sds011' as const;

  const metrics = ['pm025', 'pm10'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Sds011()),
    metrics,
    schedule,
  );

  return {
    $,
    pm025: {
      $: 'pm025' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.pm025, 'micrograms/m3'),
      metricStaleness: metricStaleness(context, state.pm025, epoch),
      state: state.pm025,
    },
    pm10: {
      $: 'pm10' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.pm10, 'micrograms/m3'),
      metricStaleness: metricStaleness(context, state.pm10, epoch),
      state: state.pm10,
    },
  };
};

export const sgp30 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
  measurementInputGetter: MeasurementInputGetter<Sgp30Request>,
) => {
  const $ = 'sgp30' as const;

  const metrics = ['eco2', 'ethanol', 'h2', 'tvoc'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Sgp30()),
    metrics,
    schedule,
    measurementInputGetter,
  );

  return {
    $,
    tvoc: {
      $: 'tvoc' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.tvoc, 'ppb'),
      state: state.tvoc,
      // eslint-disable-next-line sort-keys
      eco2: {
        main: getter(ValueType.NUMBER, state.eco2, 'ppm'),
        metricStaleness: metricStaleness(context, state.eco2, epoch),
        state: state.eco2,
      },
      ethanol: {
        main: getter(ValueType.NUMBER, state.ethanol, 'ppm'),
        metricStaleness: metricStaleness(context, state.ethanol, epoch),
        state: state.ethanol,
      },
      h2: {
        main: getter(ValueType.NUMBER, state.h2, 'ppm'),
        metricStaleness: metricStaleness(context, state.h2, epoch),
        state: state.h2,
      },
      metricStaleness: metricStaleness(context, state.tvoc, epoch),
    },
  };
};

export const tsl2561 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const $ = 'tsl2561' as const;

  const { state } = new SingleValueSensor(
    device.addService(new Tsl2561()),
    schedule,
  );

  return {
    $,
    brightness: {
      $: 'brightness' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state, 'lux'),
      metricStaleness: metricStaleness(context, state, epoch),
      state,
    },
  };
};

export const veml6070 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const $ = 'veml6070' as const;

  const { state } = new SingleValueSensor(
    device.addService(new Veml6070()),
    schedule,
  );

  return {
    $,
    uvIndex: {
      $: 'uvIndex' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state),
      metricStaleness: metricStaleness(context, state, epoch),
      state,
    },
  };
};

export const vcc = (_: Context, device: Device) => {
  const { state } = new SingleValueEvent(device.addEvent(new VCC()));

  return {
    $: 'vcc' as const,
    level: Level.PROPERTY as const,
    main: getter(ValueType.NUMBER, state),
  };
};

export const window = <T extends string | undefined>(
  _: Context,
  sensor: ReturnType<typeof ev1527WindowSensor>,
  topic: T,
) => {
  const { open } = sensor;

  return {
    $: 'window' as const,
    level: Level.PROPERTY as const,
    open,
    topic,
  };
};
