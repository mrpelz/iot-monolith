/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Device, IpDevice } from '../../device/main.js';
import { Led } from '../../items/led.js';
import { Output } from '../../items/output.js';
import {
  AnyReadOnlyObservable,
  AnyWritableObservable,
  ObservableGroup,
  ProxyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import { Indicator, IndicatorMode } from '../../services/indicator.js';
import { Led as LedService } from '../../services/led.js';
import { Output as OutputService } from '../../services/output.js';
import {
  BooleanGroupStrategy,
  BooleanNullableStateGroup,
  BooleanState,
  BooleanStateGroup,
  NullState,
} from '../../state.js';
import { Context } from '../context.js';
import { getter } from '../elements/getter.js';
import { setter } from '../elements/setter.js';
import { trigger } from '../elements/trigger.js';
import { Level, ValueType } from '../main.js';
import { InitFunction } from '../operations/init.js';
import { Introspection } from '../operations/introspection.js';
import { Metrics } from '../operations/metrics.js';
import { lastChange } from './sensors.js';

const actuatorStaleness = <T>(
  context: Context,
  state: AnyReadOnlyObservable<T | null>,
  setState: AnyWritableObservable<T>,
  device: Device,
) => {
  const $ = 'actuatorStaleness' as const;

  const stale = new BooleanState(true);
  const loading = new BooleanState(true);

  const $init: InitFunction = (self, introspection) => {
    state.observe((value) => {
      if (setState.value === value) return;
      loading.value = true;
    }, true);

    state.observe((value) => {
      stale.value = value === null;

      if (value !== null && setState.value !== value) return;
      loading.value = false;
    }, true);

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric($, 'is value of related actuator stale?', stale, {
      loading,
      ...labels,
    });
  };

  return {
    actuatorStaleness: {
      $,
      $init,
      level: Level.PROPERTY as const,
      loading: getter(ValueType.BOOLEAN, new ReadOnlyObservable(loading)),
      stale: getter(
        ValueType.BOOLEAN,
        new ReadOnlyObservable(
          new BooleanStateGroup(BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE, [
            stale,
            // invert online state to be true if device is offline
            new ReadOnlyProxyObservable(device.isOnline, (online) => !online),
          ]),
        ),
      ),
    },
  };
};

export const led = (
  context: Context,
  device: IpDevice,
  index = 0,
  indicator?: Indicator,
) => {
  const $ = 'led' as const;

  const { actualBrightness, actualOn, setBrightness, setOn } = new Led(
    device.addService(new LedService(index)),
    indicator,
  );

  const $init: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    context.persistence.observe(
      Introspection.pathString(mainReference.path),
      setBrightness,
    );

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(`${$}_actual`, 'actual state of led', actualOn, {
      brightness: new ReadOnlyProxyObservable(actualBrightness, (value) =>
        value === null ? '' : value,
      ),
      ...labels,
    });

    context.metrics.addMetric(`${$}_set`, 'set state of led', setOn, {
      brightness: setBrightness,
      ...labels,
    });
  };

  return {
    $,
    $init,
    brightness: setter(ValueType.NUMBER, setBrightness, actualBrightness),
    flip: trigger(ValueType.NULL, new NullState(() => setOn.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, setOn, actualOn, 'on'),
    topic: 'lighting' as const,
    ...actuatorStaleness(context, actualBrightness, setBrightness, device),
  };
};

export const output = <T extends string>(
  context: Context,
  device: IpDevice,
  index = 0,
  topic: T,
  indicator?: Indicator,
) => {
  const $ = 'output' as const;

  const { actualState, setState } = new Output(
    device.addService(new OutputService(index)),
    indicator,
  );

  const $init: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    context.persistence.observe(
      Introspection.pathString(mainReference.path),
      setState,
    );

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      `${$}_actual`,
      'actual state of output',
      actualState,
      labels,
    );

    context.metrics.addMetric(
      `${$}_set`,
      'set state of output',
      setState,
      labels,
    );
  };

  return {
    $,
    $init,
    flip: trigger(ValueType.NULL, new NullState(() => setState.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, setState, actualState, 'on'),
    topic,
    ...actuatorStaleness(context, actualState, setState, device),
  };
};

export const ledGrouping = (
  context: Context,
  lights: ReturnType<typeof led>[],
) => {
  const $ = 'ledGrouping' as const;

  const lights_ = Array.from(new Set(lights));

  const actualOn = new ReadOnlyObservable(
    new BooleanNullableStateGroup(
      BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
      lights_.map((light) => light.main.state),
    ),
  );

  const actualBrightness = new ReadOnlyObservable(
    new (class extends ObservableGroup<number> {
      protected _merge(): number {
        return this.values.reduce((a, b) => a + b, 0) / this.values.length;
      }
    })(
      0,
      lights_.map(
        (light) =>
          new ReadOnlyProxyObservable(light.brightness.state, (value) =>
            value === null ? 0 : value,
          ),
      ),
    ),
  );

  const setOn = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    lights_.map((light) => light.main.setState),
  );

  const setBrightness = new (class extends ObservableGroup<number> {
    protected _merge(): number {
      return this.values.reduce((a, b) => a + b, 0) / this.values.length;
    }
  })(
    0,
    lights_.map((light) => light.brightness.setState),
  );

  const $init: InitFunction = (self, introspection) => {
    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      `${$}_actual`,
      'actual state of led group',
      actualOn,
      {
        brightness: actualBrightness,
        ...labels,
      },
    );

    context.metrics.addMetric(`${$}_set`, 'set state of led group', setOn, {
      brightness: setBrightness,
      ...labels,
    });
  };

  return {
    $,
    $init,
    $noMainReference: true as const,
    brightness: setter(ValueType.NUMBER, setBrightness, actualBrightness),
    flip: trigger(ValueType.NULL, new NullState(() => setOn.flip())),
    level: Level.PROPERTY as const,
    lights: lights_,
    main: setter(ValueType.BOOLEAN, setOn, actualOn, 'on'),
    topic: 'lighting',
  };
};

export const outputGrouping = <T extends string>(
  context: Context,
  outputs: (ReturnType<typeof output> | ReturnType<typeof led>)[],
  topic = 'lighting' as T,
) => {
  const $ = 'outputGrouping' as const;

  const outputs_ = Array.from(new Set(outputs));

  const actualState = new ReadOnlyObservable(
    new BooleanNullableStateGroup(
      BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
      outputs_.map((outputElement) => outputElement.main.state),
    ),
  );

  const setState = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    outputs_.map((outputElement) => outputElement.main.setState),
  );

  const $init: InitFunction = (self, introspection) => {
    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      `${$}_actual`,
      'actual state of output group',
      actualState,
      labels,
    );

    context.metrics.addMetric(
      `${$}_set`,
      'set state of output group',
      setState,
      labels,
    );
  };

  return {
    $,
    $init,
    $noMainReference: true as const,
    flip: trigger(ValueType.NULL, new NullState(() => setState.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, setState, actualState, 'on'),
    outputs: outputs_,
    topic,
  };
};

export const online = (
  context: Context,
  device: IpDevice,
  initiallyOnline: boolean,
) => {
  const $ = 'online' as const;

  const state = new BooleanState(initiallyOnline);

  const $init: InitFunction = (self, introspection) => {
    if (initiallyOnline) {
      device.transport.connect();
    }

    state.observe((value) => {
      if (value) {
        device.transport.connect();

        return;
      }

      device.transport.disconnect();
    });

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      `${$}_actual`,
      'is device online?',
      device.isOnline,
      labels,
    );

    context.metrics.addMetric(
      `${$}_set`,
      'is device set to online?',
      state,
      labels,
    );
  };

  return {
    online: {
      $,
      $init,
      flip: trigger(ValueType.NULL, new NullState(() => state.flip())),
      level: Level.PROPERTY as const,
      main: setter(ValueType.BOOLEAN, state, device.isOnline),
      ...lastChange(context, device.isOnline),
    },
  };
};

export const resetDevice = (_: Context, device: Device) => ({
  resetDevice: {
    $: 'resetDevice' as const,
    level: Level.PROPERTY as const,
    main: trigger(ValueType.NULL, new NullState(() => device.triggerReset())),
  },
});

export const identifyDevice = (_: Context, indicator: Indicator) => ({
  identifyDevice: {
    $: 'identifyDevice' as const,
    level: Level.PROPERTY as const,
    main: trigger(
      ValueType.NULL,
      new NullState(() =>
        indicator
          .request({
            blink: 10,
            mode: IndicatorMode.BLINK,
          })
          .catch(() => {
            // noop
          }),
      ),
    ),
  },
});

export const triggerElement = <T extends string>(
  _: Context,
  handler: () => void,
  topic: T,
) => ({
  $: 'triggerElement' as const,
  level: Level.PROPERTY as const,
  main: trigger(ValueType.NULL, new NullState(handler), 'trigger'),
  topic,
});

export class SceneMember<T> {
  constructor(
    public readonly observable: AnyWritableObservable<T>,
    public readonly onValue: T,
    public readonly offValue?: T,
  ) {}
}

export const scene = <T extends string>(
  context: Context,
  members: readonly SceneMember<unknown>[],
  topic: T,
) => {
  const $ = 'scene' as const;

  const proxyObservables = members.map(
    <U>({ observable, onValue, offValue = onValue }: SceneMember<U>) =>
      new ProxyObservable<U, boolean>(
        observable,
        (value) => value === onValue,
        (on) => (on ? onValue : offValue),
      ),
  );

  const set = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    proxyObservables,
  );

  const $init: InitFunction = (self, introspection) => {
    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric($, 'state of scene', set, labels);
  };

  return {
    $,
    $init,
    flip: trigger(ValueType.NULL, new NullState(() => set.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, set, undefined, 'scene'),
    topic,
  };
};
