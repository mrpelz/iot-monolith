/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { safeAsync } from '@mrpelz/misc-utils/async';
import {
  AnyReadOnlyObservable,
  AnyWritableObservable,
  ObservableGroup,
  ProxyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '@mrpelz/observable';
import {
  BooleanGroupStrategy,
  BooleanNullableStateGroup,
  BooleanState,
  BooleanStateGroup,
  NullState,
} from '@mrpelz/observable/state';

import { Device, IpDevice } from '../../device/main.js';
import {
  OutputBinaryProgress,
  OutputBuzzerProgress,
  OutputDimmableProgress,
  OutputDimmableRGBProgress,
} from '../../events/output-ng-progress.js';
import {
  ExternalStateSettable,
  ExternalStateSettableScheduled,
} from '../../items/external-state.js';
import { Led } from '../../items/led.js';
import { Output } from '../../items/output.js';
import {
  OutputBinary,
  OutputIndicator,
  universalIndicatorBlink,
} from '../../items/output-ng-binary.js';
import { OutputBuzzer } from '../../items/output-ng-buzzer.js';
import { OutputDimmable } from '../../items/output-ng-dimmable.js';
import { OutputDimmableRGB } from '../../items/output-ng-dimmable-rgb.js';
import { Indicator, IndicatorMode } from '../../services/indicator.js';
import { Led as LedService } from '../../services/led.js';
import { Output as OutputService } from '../../services/output.js';
import { OutputBinary as OutputBinaryService } from '../../services/output-ng-binary.js';
import { OutputBuzzer as OutputBuzzerService } from '../../services/output-ng-buzzer.js';
import { OutputDimmable as OutputDimmableService } from '../../services/output-ng-dimmable.js';
import { OutputDimmableRGB as OutputDimmableRGBService } from '../../services/output-ng-dimmable-rgb.js';
import { Context } from '../context.js';
import { getter } from '../elements/getter.js';
import { setter, setterNullable } from '../elements/setter.js';
import { trigger } from '../elements/trigger.js';
import { Level, TValueType, ValueType } from '../main.js';
import { InitFunction } from '../operations/init.js';
import { lastChange, lastSeen } from './sensors.js';

const actuatorStaleness = <T>(
  context: Context,
  state: AnyReadOnlyObservable<T | null>,
  setState: AnyWritableObservable<T>,
  device: Device,
) => {
  const $ = 'actuatorStaleness' as const;

  const stale = new BooleanState(true);
  const loading = new BooleanState(true);

  const $init: InitFunction = () => {
    setState.observe((value) => {
      if (state.value === value) return;
      loading.value = true;
    }, true);

    state.observe((value) => {
      stale.value = value === null;

      if (value !== null && setState.value !== value) return;
      loading.value = false;
    }, true);
  };

  return {
    $,
    $init,
    lastChange: lastChange(context, state),
    lastSeen: lastSeen(context, setState),
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
  };
};

export const externalStateSettable = <
  V extends ValueType,
  I extends string,
  T extends string,
>(
  context: Context,
  valueType: V,
  state:
    | ExternalStateSettable<TValueType[V]>
    | ExternalStateSettableScheduled<TValueType[V]>,
  identifier: I,
  topic: T,
) => {
  const flip =
    valueType === ValueType.BOOLEAN
      ? trigger(
          ValueType.NULL,
          new NullState(
            () => ((state.setState.value as boolean) = !state.setState.value),
          ),
        )
      : undefined;

  return {
    $: identifier,
    flip: flip as V extends ValueType.BOOLEAN
      ? Exclude<typeof flip, undefined>
      : undefined,
    lastChange: lastChange(context, state.actualState),
    lastSeen: lastSeen(context, state.actualState),
    level: Level.PROPERTY as const,
    main: setter(valueType, state.setState, state.actualState),
    state,
    topic,
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

    context.persistence.observe(mainReference.pathString, setBrightness);
  };

  return {
    $,
    $init,
    actuatorStaleness: actuatorStaleness(
      context,
      actualBrightness,
      setBrightness,
      device,
    ),
    brightness: setter(ValueType.NUMBER, setBrightness, actualBrightness),
    flip: trigger(ValueType.NULL, new NullState(() => setOn.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, setOn, actualOn, 'on'),
    topic: 'lighting' as const,
  };
};

export const outputNg = <T extends string | undefined>(
  context: Context,
  device: IpDevice,
  index = 0,
  topic: T,
  indicator?: OutputIndicator,
) => {
  const $ = 'output' as const;

  const state = new OutputBinary(
    device.addService(new OutputBinaryService(index)),
    device.addEvent(new OutputBinaryProgress(index)),
    indicator,
  );

  const { actualState, animationState, setState } = state;

  const $init: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    context.persistence.observe(mainReference.pathString, setState);
  };

  return {
    $,
    $init,
    actuatorStaleness: actuatorStaleness(
      context,
      actualState,
      setState,
      device,
    ),
    animationState: getter(ValueType.STRING, animationState),
    flip: trigger(ValueType.NULL, new NullState(() => setState.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, setState, actualState, 'on'),
    state,
    topic,
  };
};

export const outputNgBuzzer = <T extends string | undefined>(
  context: Context,
  device: IpDevice,
  index = 0,
  topic: T,
  indicator?: OutputIndicator,
) => {
  const $ = 'buzzer' as const;

  const state = new OutputBuzzer(
    device.addService(new OutputBuzzerService(index)),
    device.addEvent(new OutputBuzzerProgress(index)),
    indicator,
  );

  const { actualState, animationState, setState } = state;

  const $init: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    context.persistence.observe(mainReference.pathString, setState);
  };

  return {
    $,
    $init,
    actuatorStaleness: actuatorStaleness(
      context,
      actualState,
      setState,
      device,
    ),
    animationState: getter(ValueType.STRING, animationState),
    level: Level.PROPERTY as const,
    main: setter(ValueType.NUMBER, setState, actualState, 'frequency'),
    state,
    topic,
  };
};

export const outputNgDimmable = (
  context: Context,
  device: IpDevice,
  index = 0,
  indicator?: OutputIndicator,
) => {
  const $ = 'led' as const;

  const state = new OutputDimmable(
    device.addService(new OutputDimmableService(index)),
    device.addEvent(new OutputDimmableProgress(index)),
    indicator,
  );

  const {
    actualBrightness,
    actualOn,
    animationState,
    customRampTime,
    setBrightness,
    setOn,
  } = state;

  const $init: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};

    if (!mainReference) return;

    context.persistence.observe(mainReference.pathString, setBrightness);
  };

  return {
    $,
    $init,
    actuatorStaleness: actuatorStaleness(
      context,
      actualBrightness,
      setBrightness,
      device,
    ),
    animationState: getter(ValueType.STRING, animationState),
    brightness: setter(ValueType.NUMBER, setBrightness, actualBrightness),
    customRampTime: setterNullable(ValueType.NUMBER, customRampTime),
    flip: trigger(ValueType.NULL, new NullState(() => setOn.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, setOn, actualOn, 'on'),
    state,
    topic: 'lighting' as const,
  };
};

export const outputNgDimmableRGB = (
  context: Context,
  device: IpDevice,
  index = 0,
  indicator?: OutputIndicator,
) => {
  const $ = 'ledRGB' as const;

  const state = new OutputDimmableRGB(
    device.addService(new OutputDimmableRGBService(index)),
    device.addEvent(new OutputDimmableRGBProgress(index)),
    indicator,
  );

  const { actualState, animationState, customRampTime, setState } = state;

  const $init: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};

    if (!mainReference) return;

    context.persistence.observe(mainReference.pathString, setState);
  };

  return {
    $,
    $init,
    actuatorStaleness: actuatorStaleness(
      context,
      actualState,
      setState,
      device,
    ),
    animationState: getter(ValueType.STRING, animationState),
    customRampTime: setterNullable(ValueType.NUMBER, customRampTime),
    level: Level.PROPERTY as const,
    main: setter(ValueType.RAW, setState, actualState, 'rgb'),
    state,
    topic: 'lighting' as const,
  };
};

export const output = <T extends string | undefined>(
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

    context.persistence.observe(mainReference.pathString, setState);
  };

  return {
    $,
    $init,
    actuatorStaleness: actuatorStaleness(
      context,
      actualState,
      setState,
      device,
    ),
    flip: trigger(ValueType.NULL, new NullState(() => setState.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, setState, actualState, 'on'),
    topic,
  };
};

export const ledGrouping = (
  context: Context,
  lights: (ReturnType<typeof led> | ReturnType<typeof outputNgDimmable>)[],
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

  return {
    $,
    $noMainReference: true as const,
    brightness: setter(ValueType.NUMBER, setBrightness, actualBrightness),
    flip: trigger(ValueType.NULL, new NullState(() => setOn.flip())),
    lastChange: lastChange(context, actualBrightness),
    lastSeen: lastSeen(context, setBrightness),
    level: Level.PROPERTY as const,
    lights: lights_,
    main: setter(ValueType.BOOLEAN, setOn, actualOn, 'on'),
    topic: 'lighting' as const,
  };
};

export const outputGrouping = <T extends string | undefined>(
  context: Context,
  outputs: (
    | ReturnType<typeof output>
    | ReturnType<typeof outputNg>
    | ReturnType<typeof led>
    | ReturnType<typeof outputNgDimmable>
    | ReturnType<
        typeof externalStateSettable<ValueType.BOOLEAN, 'output', string>
      >
  )[],
  topic: T,
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

  return {
    $,
    $noMainReference: true as const,
    flip: trigger(ValueType.NULL, new NullState(() => setState.flip())),
    lastChange: lastChange(context, actualState),
    lastSeen: lastSeen(context, setState),
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

  const $init: InitFunction = () => {
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
  };

  return {
    $,
    $init,
    flip: trigger(ValueType.NULL, new NullState(() => state.flip())),
    lastChange: lastChange(context, device.isOnline),
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, state, device.isOnline),
  };
};

export const resetDevice = (_: Context, device: Device) => ({
  $: 'resetDevice' as const,
  level: Level.PROPERTY as const,
  main: trigger(ValueType.NULL, new NullState(() => device.triggerReset())),
});

export const identifyDevice = (
  _: Context,
  indicator: Indicator | OutputIndicator,
) => ({
  $: 'identifyDevice' as const,
  level: Level.PROPERTY as const,
  main: trigger(
    ValueType.NULL,
    new NullState(() => {
      safeAsync(async () => {
        if (indicator instanceof Indicator) {
          await indicator
            .request({
              blink: 10,
              mode: IndicatorMode.BLINK,
            })
            .catch(() => {
              // noop
            });

          return;
        }

        await universalIndicatorBlink(indicator, 10);
      });
    }),
  ),
});

export const triggerElement = <T extends string>(
  context: Context,
  topic: T,
  handler?: () => void,
) => {
  const state = new NullState(handler);

  return {
    $: 'triggerElement' as const,
    lastSeen: lastSeen(context, state),
    level: Level.PROPERTY as const,
    main: trigger(ValueType.NULL, state, 'trigger'),
    state,
    topic,
  };
};

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
        (on) => {
          const target = on ? onValue : offValue;

          if (observable.value === target) return ProxyObservable.doNotSet;
          return target;
        },
      ),
  );

  const set = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    proxyObservables,
  );

  return {
    $,
    flip: trigger(ValueType.NULL, new NullState(() => set.flip())),
    lastChange: lastChange(context, set),
    lastSeen: lastSeen(context, set),
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, set, undefined, 'scene'),
    state: set,
    topic,
  };
};
