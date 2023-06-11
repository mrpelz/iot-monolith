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
import {
  Level,
  ValueType,
  element,
  symbolInstance,
  symbolLevel,
  symbolMain,
} from '../main.js';
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
    lastChange: element(
      {
        [symbolLevel]: Level.PROPERTY,
        [symbolMain]: getter(
          ValueType.NUMBER,
          new ReadOnlyObservable(seen),
          'date'
        ),
      },
      () => {
        state.observe((value) => {
          if (value === null) return;

          seen.value = Date.now();
        });
      }
    ),
  };
};

export const lastSeen = <T>(
  state: ReadOnlyObservable<T> | ReadOnlyNullState<T>
) => {
  const seen = new Observable<number | null>(null);

  return {
    lastSeen: element(
      {
        [symbolLevel]: Level.PROPERTY,
        [symbolMain]: getter(
          ValueType.NUMBER,
          new ReadOnlyObservable(seen),
          'date'
        ),
      },
      () => {
        state.observe((value) => {
          if (state instanceof ReadOnlyObservable && value === null) return;

          seen.value = Date.now();
        }, true);
      }
    ),
  };
};

export const metricStaleness = <T>(
  state: ReadOnlyObservable<T | null>,
  timeout: number
) => {
  const stale = new BooleanState(true);

  return {
    ...lastSeen(state),
    stale: element(
      {
        [symbolLevel]: Level.PROPERTY,
        [symbolMain]: getter(ValueType.BOOLEAN, new ReadOnlyObservable(stale)),
      },
      () => {
        const timer = new Timer(timeout + epochs.second * 10);
        timer.observe(() => {
          stale.value = true;
        });

        state.observe((value) => {
          stale.value = value === null;
          timer.start();
        }, true);
      }
    ),
  };
};

export const async = (device: Device, [schedule, epoch]: ScheduleEpochPair) => {
  const { state } = new SingleValueSensor(
    device.addService(new Async()),
    schedule
  );

  return element({
    ...metricStaleness(state, epoch),
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: getter(ValueType.RAW, state),
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
    humidity: element({
      ...metricStaleness(state.humidity, epoch),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, state.humidity, 'percent-rh'),
    }),
    pressure: element({
      ...metricStaleness(state.pressure, epoch),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, state.pressure, 'pa'),
    }),
    temperature: element({
      ...metricStaleness(state.temperature, epoch),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
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
    tvoc: element({
      ...metricStaleness(state.tvoc, epoch),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, state.tvoc, 'ppb'),
      // eslint-disable-next-line sort-keys
      eco2: element({
        ...metricStaleness(state.eco2, epoch),
        [symbolLevel]: Level.PROPERTY,
        [symbolMain]: getter(ValueType.NUMBER, state.eco2, 'ppm'),
      }),
      temperature: element({
        ...metricStaleness(state.temperature, epoch),
        [symbolLevel]: Level.PROPERTY,
        [symbolMain]: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
      }),
    }),
  };
};

export const button = (device: Device, index = 0) => {
  const buttonEvent = device.addEvent(new ButtonEvent(index));

  return element({
    ...lastSeen(buttonEvent.observable),
    [symbolInstance]: new Button(buttonEvent),
    [symbolLevel]: Level.PROPERTY,
  });
};

export const hello = (device: Device, [schedule, epoch]: ScheduleEpochPair) => {
  const { state } = new SingleValueSensor(
    device.addService(new Hello()),
    schedule
  );

  return {
    hello: element({
      ...metricStaleness(state, epoch),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.STRING, state),
    }),
  };
};

export const input = <T extends string>(
  device: Device,
  index = 0,
  topic: T
) => {
  const { state } = new SingleValueEvent(device.addEvent(new Input(index)));

  return element({
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: getter(ValueType.BOOLEAN, state),
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

  return element({
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: getter(ValueType.BOOLEAN, new ReadOnlyObservable(state)),
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
    temperature: element({
      ...metricStaleness(state, epoch),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, state, 'deg-c'),
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
    co2: element({
      ...metricStaleness(state.co2, epoch),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, state.co2, 'ppm'),
      // eslint-disable-next-line sort-keys
      abc: element({
        ...metricStaleness(state.abc, epoch),
        [symbolMain]: getter(ValueType.BOOLEAN, state.abc),
      }),
      accuracy: element({
        ...metricStaleness(state.accuracy, epoch),
        [symbolMain]: getter(ValueType.NUMBER, state.accuracy, 'percent'),
      }),
      temperature: element({
        ...metricStaleness(state.temperature, epoch),
        [symbolMain]: getter(ValueType.NUMBER, state.temperature, 'deg-c'),
      }),
      transmittance: element({
        ...metricStaleness(state.transmittance, epoch),
        [symbolMain]: getter(ValueType.NUMBER, state.transmittance, 'percent'),
      }),
    }),
  };
};

export const online = (device: Device) => ({
  online: element({
    ...lastChange(device.isOnline),
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: getter(ValueType.BOOLEAN, device.isOnline),
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
    rfReadout: element({
      ...lastSeen(readOnlyState),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.RAW, readOnlyState),
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
      element({
        ...metricStaleness(state.pm025, epoch),
        [symbolLevel]: Level.PROPERTY,
        [symbolMain]: getter(ValueType.NUMBER, state.pm025, 'micrograms/m3'),
      }))(),
    pm10: (() =>
      element({
        ...metricStaleness(state.pm10, epoch),
        [symbolLevel]: Level.PROPERTY,
        [symbolMain]: getter(ValueType.NUMBER, state.pm10, 'micrograms/m3'),
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
    tvoc: element({
      ...metricStaleness(state.tvoc, epoch),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, state.tvoc, 'ppb'),
      // eslint-disable-next-line sort-keys
      eco2: element({
        ...metricStaleness(state.eco2, epoch),
        [symbolMain]: getter(ValueType.NUMBER, state.eco2, 'ppm'),
      }),
      ethanol: element({
        ...metricStaleness(state.ethanol, epoch),
        [symbolMain]: getter(ValueType.NUMBER, state.ethanol, 'ppm'),
      }),
      h2: element({
        ...metricStaleness(state.h2, epoch),
        [symbolMain]: getter(ValueType.NUMBER, state.h2, 'ppm'),
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
    brightness: element({
      ...metricStaleness(state, epoch),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, state, 'lux'),
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
    uvIndex: element({
      ...metricStaleness(state, epoch),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, state),
    }),
  };
};

export const vcc = (device: Device) => {
  const { state } = new SingleValueEvent(device.addEvent(new VCC()));

  return {
    vcc: element({
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, state),
    }),
  };
};
