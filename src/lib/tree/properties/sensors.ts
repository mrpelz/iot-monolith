/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { byteLengthAddress } from '../../device/ev1527.js';
import { Device } from '../../device/main.js';
import { epochs } from '../../epochs.js';
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
import {
  AnyObservable,
  AnyReadOnlyObservable,
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
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
import {
  BooleanGroupStrategy,
  BooleanState,
  BooleanStateGroup,
  ReadOnlyNullState,
} from '../../state.js';
import { Timer } from '../../timer.js';
import { Context } from '../context.js';
import { ev1527WindowSensor } from '../devices/ev1527-window-sensor.js';
import { getter } from '../elements/getter.js';
import { Level, ValueType } from '../main.js';
import { InitFunction } from '../operations/init.js';
import { Metrics } from '../operations/metrics.js';

export type Timings = Record<string, ScheduleEpochPair | undefined> & {
  default: ScheduleEpochPair;
};

export const lastChange = <T>(
  context: Context,
  state: AnyReadOnlyObservable<T>,
) => {
  const $ = 'lastChange' as const;

  const changed = new Observable<number | null>(null);

  const $init: InitFunction = (self, introspection) => {
    state.observe((value) => {
      if (value === null) return;

      changed.value = Date.now();
    });

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      $,
      'when did related sensor value last change?',
      changed,
      labels,
    );
  };

  return {
    lastChange: {
      $,
      $init,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, new ReadOnlyObservable(changed), 'date'),
    },
  };
};

export const lastSeen = <T>(
  context: Context,
  state: ReadOnlyObservable<T> | ReadOnlyNullState<T>,
) => {
  const $ = 'lastSeen' as const;

  const seen = new Observable<number | null>(null);

  const $init: InitFunction = (self, introspection) => {
    state.observe((value) => {
      if (state instanceof ReadOnlyObservable && value === null) return;

      seen.value = Date.now();
    }, true);

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      $,
      'when was related sensor value last seen (even without changing)?',
      seen,
      labels,
    );
  };

  return {
    lastSeen: {
      $,
      $init,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, new ReadOnlyObservable(seen), 'date'),
    },
  };
};

export const metricStaleness = <T>(
  context: Context,
  state: ReadOnlyObservable<T | null>,
  timeout: number,
) => {
  const $ = 'metricStaleness' as const;

  const stale = new BooleanState(true);

  const $init: InitFunction = (self, introspection) => {
    const timer = new Timer(timeout + epochs.second * 10);
    timer.observe(() => {
      stale.value = true;
    });

    state.observe((value) => {
      stale.value = value === null;
      timer.start();
    }, true);

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      $,
      'is value of related sensor stale?',
      stale,
      labels,
    );
  };

  return {
    stale: {
      $,
      $init,
      level: Level.PROPERTY as const,
      main: getter(ValueType.BOOLEAN, new ReadOnlyObservable(stale)),
    },
    ...lastSeen(context, state),
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
    async: {
      $: 'async' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.RAW, state),
      ...metricStaleness(context, state, epoch),
    },
  };
};

export const bme280 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const { state } = new MultiValueSensor(
    device.addService(new Bme280()),
    ['humidity', 'pressure', 'temperature'] as const,
    schedule,
  );

  return {
    humidity: {
      $: 'humidity' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.humidity, 'percent-rh'),
      ...metricStaleness(context, state.humidity, epoch),
    },
    pressure: {
      $: 'pressure' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.pressure, 'pa'),
      ...metricStaleness(context, state.pressure, epoch),
    },
    temperature: {
      $: 'temperature' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
      ...metricStaleness(context, state.temperature, epoch),
    },
  };
};

export const ccs811 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
  measurementInputGetter: MeasurementInputGetter<Ccs811Request>,
) => {
  const metrics = ['eco2', 'temperature', 'tvoc'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Ccs811()),
    metrics,
    schedule,
    measurementInputGetter,
  );

  return {
    tvoc: {
      $: 'tvoc' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.tvoc, 'ppb'),
      // eslint-disable-next-line sort-keys
      eco2: {
        level: Level.PROPERTY as const,
        main: getter(ValueType.NUMBER, state.eco2, 'ppm'),
        ...metricStaleness(context, state.eco2, epoch),
      },
      temperature: {
        level: Level.PROPERTY as const,
        main: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
        ...metricStaleness(context, state.temperature, epoch),
      },
      ...metricStaleness(context, state.tvoc, epoch),
    },
  };
};

export const button = (context: Context, device: Device, index = 0) => {
  const buttonEvent = device.addEvent(new ButtonEvent(index));

  return {
    $: 'button' as const,
    level: Level.PROPERTY as const,
    state: new Button(buttonEvent),
    ...lastSeen(context, buttonEvent.observable),
  };
};

export const door = (
  _: Context,
  sensor: ReturnType<typeof ev1527WindowSensor>,
) => {
  const $ = 'door' as const;

  const { open } = sensor.internal;

  return {
    $,
    level: Level.PROPERTY as const,
    open,
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

  const $init: InitFunction = (self, introspection) => {
    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric($, 'diagnostic device data', new Observable(1), {
      hello: new ReadOnlyProxyObservable(state, (value) =>
        value === null ? '' : value,
      ),
      ...labels,
    });
  };

  return {
    hello: {
      $,
      $init,
      level: Level.PROPERTY as const,
      main: getter(ValueType.STRING, state),
      ...metricStaleness(context, state, epoch),
    },
  };
};

export const input = <T extends string>(
  context: Context,
  device: Device,
  index = 0,
  topic: T,
) => {
  const $ = 'input' as const;

  const { state } = new SingleValueEvent(device.addEvent(new Input(index)));

  const $init: InitFunction = (self, introspection) => {
    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric($, 'actual state of input', state, labels);
  };

  return {
    $,
    $init,
    level: Level.PROPERTY as const,
    main: getter(ValueType.BOOLEAN, state),
    topic,
  };
};

export const inputGrouping = (
  context: Context,
  ...inputs: AnyObservable<boolean | null>[]
) => {
  const $ = 'inputGrouping' as const;

  const state = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    inputs.map(
      (anInput) =>
        new ReadOnlyProxyObservable(anInput, (value) => Boolean(value)),
    ),
  );

  const $init: InitFunction = (self, introspection) => {
    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric($, 'actual state of input group', state, labels);
  };

  return {
    $,
    $init,
    level: Level.PROPERTY as const,
    main: getter(ValueType.BOOLEAN, new ReadOnlyObservable(state)),
  };
};

export const mcp9808 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const { state } = new SingleValueSensor(
    device.addService(new Mcp9808()),
    schedule,
  );

  return {
    temperature: {
      $: 'temperature' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state, 'deg-c'),
      ...metricStaleness(context, state, epoch),
    },
  };
};

export const mhz19 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
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
    co2: {
      $: 'co2' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.co2, 'ppm'),
      // eslint-disable-next-line sort-keys
      abc: {
        main: getter(ValueType.BOOLEAN, state.abc),
        ...metricStaleness(context, state.abc, epoch),
      },
      accuracy: {
        main: getter(ValueType.NUMBER, state.accuracy, 'percent'),
        ...metricStaleness(context, state.accuracy, epoch),
      },
      temperature: {
        main: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
        ...metricStaleness(context, state.temperature, epoch),
      },
      transmittance: {
        main: getter(ValueType.NUMBER, state.transmittance, 'percent'),
        ...metricStaleness(context, state.transmittance, epoch),
      },
      ...metricStaleness(context, state.co2, epoch),
    },
  };
};

export const rfReadout = (
  context: Context,
  espNowEvent: ESPNow,
  rf433Event: Rf433,
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = new Observable<any>({});

  espNowEvent.observable.observe(({ deviceIdentifier, data }) => {
    state.value = {
      espNow: {
        data: [...data],
        macAddress: [...deviceIdentifier]
          .map((octet) => octet.toString(16).padStart(2, '0'))
          .join(':'),
      },
      ...state.value,
    };
  });

  rf433Event.observable.observe(
    ({ data, deviceIdentifier, protocol, value }) => {
      state.value = {
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
        ...state.value,
      };
    },
  );

  const readOnlyState = new ReadOnlyObservable(state);

  return {
    rfReadout: {
      $: 'rfReadout' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.RAW, readOnlyState),
      ...lastSeen(context, readOnlyState),
    },
  };
};

export const sds011 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const metrics = ['pm025', 'pm10'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Sds011()),
    metrics,
    schedule,
  );

  return {
    pm025: {
      $: 'pm025' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.pm025, 'micrograms/m3'),
      ...metricStaleness(context, state.pm025, epoch),
    },
    pm10: {
      $: 'pm10' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.pm10, 'micrograms/m3'),
      ...metricStaleness(context, state.pm10, epoch),
    },
  };
};

export const sgp30 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
  measurementInputGetter: MeasurementInputGetter<Sgp30Request>,
) => {
  const metrics = ['eco2', 'ethanol', 'h2', 'tvoc'] as const;

  const { state } = new MultiValueSensor(
    device.addService(new Sgp30()),
    metrics,
    schedule,
    measurementInputGetter,
  );

  return {
    tvoc: {
      $: 'tvoc' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state.tvoc, 'ppb'),
      // eslint-disable-next-line sort-keys
      eco2: {
        main: getter(ValueType.NUMBER, state.eco2, 'ppm'),
        ...metricStaleness(context, state.eco2, epoch),
      },
      ethanol: {
        main: getter(ValueType.NUMBER, state.ethanol, 'ppm'),
        ...metricStaleness(context, state.ethanol, epoch),
      },
      h2: {
        main: getter(ValueType.NUMBER, state.h2, 'ppm'),
        ...metricStaleness(context, state.h2, epoch),
      },
      ...metricStaleness(context, state.tvoc, epoch),
    },
  };
};

export const tsl2561 = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const { state } = new SingleValueSensor(
    device.addService(new Tsl2561()),
    schedule,
  );

  return {
    brightness: {
      $: 'brightness' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state, 'lux'),
      ...metricStaleness(context, state, epoch),
    },
  };
};

export const uvIndex = (
  context: Context,
  device: Device,
  [schedule, epoch]: ScheduleEpochPair,
) => {
  const { state } = new SingleValueSensor(
    device.addService(new Veml6070()),
    schedule,
  );

  return {
    uvIndex: {
      $: 'uvIndex' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state),
      ...metricStaleness(context, state, epoch),
    },
  };
};

export const vcc = (_: Context, device: Device) => {
  const { state } = new SingleValueEvent(device.addEvent(new VCC()));

  return {
    vcc: {
      $: 'vcc' as const,
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, state),
    },
  };
};

export const window = (
  _: Context,
  sensor: ReturnType<typeof ev1527WindowSensor>,
) => {
  const { open } = sensor.internal;

  return {
    $: 'window' as const,
    level: Level.PROPERTY as const,
    open,
  };
};
