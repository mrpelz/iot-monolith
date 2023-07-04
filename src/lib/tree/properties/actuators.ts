/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  AnyReadOnlyObservable,
  AnyWritableObservable,
  ObservableGroup,
  ProxyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import {
  BooleanGroupStrategy,
  BooleanNullableStateGroup,
  BooleanState,
  BooleanStateGroup,
  NullState,
} from '../../state.js';
import { Device, IpDevice } from '../../device/main.js';
import { Element, Level, ValueType as ValueTypeNg } from '../main.js';
import { Indicator, IndicatorMode } from '../../services/indicator.js';
import { Led } from '../../items/led.js';
import { Led as LedService } from '../../services/led.js';
import { Output } from '../../items/output.js';
import { Output as OutputService } from '../../services/output.js';
import { Persistence } from '../../persistence.js';
import { getter } from '../elements/getter.js';
import { setter } from '../elements/setter.js';
import { trigger as triggerElement } from '../elements/trigger.js';

const actuatorStaleness = <T>(
  state: AnyReadOnlyObservable<T | null>,
  setState: AnyWritableObservable<T>,
  device: Device
) => {
  const stale = new BooleanState(true);
  const loading = new BooleanState(true);

  return {
    actuatorStaleness: new Element({
      $: 'actuatorStaleness' as const,
      level: Level.PROPERTY as const,
      loading: getter(ValueTypeNg.BOOLEAN, new ReadOnlyObservable(loading)),
      stale: getter(
        ValueTypeNg.BOOLEAN,
        new ReadOnlyObservable(
          new BooleanStateGroup(BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE, [
            stale,
            // invert online state to be true if device is offline
            new ReadOnlyProxyObservable(device.isOnline, (online) => !online),
          ])
        )
      ),
    }),
  };
};

export const led = (
  device: IpDevice,
  index = 0,
  indicator?: Indicator,
  persistence?: Persistence
) => {
  const { actualBrightness, actualOn, setBrightness, setOn } = new Led(
    device.addService(new LedService(index)),
    indicator
  );

  return new Element({
    $: 'led' as const,
    ...actuatorStaleness(actualBrightness, setBrightness, device),
    brightness: setter(ValueTypeNg.NUMBER, setBrightness, actualBrightness),
    flip: triggerElement(ValueTypeNg.NULL, new NullState(() => setOn.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueTypeNg.BOOLEAN, setOn, actualOn, 'on'),
    topic: 'lighting' as const,
  });
};

export const output = <T extends string>(
  device: IpDevice,
  index = 0,
  topic: T,
  indicator?: Indicator,
  persistence?: Persistence
) => {
  const { actualState, setState } = new Output(
    device.addService(new OutputService(index)),
    indicator
  );

  return new Element({
    $: 'output' as const,
    ...actuatorStaleness(actualState, setState, device),
    flip: triggerElement(
      ValueTypeNg.NULL,
      new NullState(() => setState.flip())
    ),
    level: Level.PROPERTY as const,
    main: setter(ValueTypeNg.BOOLEAN, setState, actualState, 'on'),
    topic,
  });
};

export const ledGrouping = (lights: ReturnType<typeof led>[]) => {
  const actualOn = new ReadOnlyObservable(
    new BooleanNullableStateGroup(
      BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
      lights.map((light) => light.props.main.props.state)
    )
  );

  const actualBrightness = new ReadOnlyObservable(
    new (class extends ObservableGroup<number> {
      protected _merge(): number {
        return this.values.reduce((a, b) => a + b, 0) / this.values.length;
      }
    })(
      0,
      lights.map(
        (light) =>
          new ReadOnlyProxyObservable(
            light.props.brightness.props.state,
            (value) => (value === null ? 0 : value)
          )
      )
    )
  );

  const setOn = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    lights.map((light) => light.props.main.props.setState)
  );

  const setBrightness = new (class extends ObservableGroup<number> {
    protected _merge(): number {
      return this.values.reduce((a, b) => a + b, 0) / this.values.length;
    }
  })(
    0,
    lights.map((light) => light.props.brightness.props.setState)
  );

  return new Element({
    $: 'ledGrouping' as const,
    brightness: setter(ValueTypeNg.NUMBER, setBrightness, actualBrightness),
    flip: triggerElement(ValueTypeNg.NULL, new NullState(() => setOn.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueTypeNg.BOOLEAN, setOn, actualOn, 'on'),
    topic: 'lighting',
  });
};

export const outputGrouping = <T extends string>(
  outputs: (ReturnType<typeof output> | ReturnType<typeof led>)[],
  topic = 'lighting' as T
) => {
  const actualState = new ReadOnlyObservable(
    new BooleanNullableStateGroup(
      BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
      outputs.map((outputElement) => outputElement.props.main.props.state)
    )
  );

  const setState = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    outputs.map((outputElement) => outputElement.props.main.props.setState)
  );

  return new Element({
    $: 'outputGrouping' as const,
    flip: triggerElement(
      ValueTypeNg.NULL,
      new NullState(() => setState.flip())
    ),
    level: Level.PROPERTY as const,
    main: setter(ValueTypeNg.BOOLEAN, setState, actualState, 'on'),
    topic,
  });
};

export const resetDevice = (device: Device) => ({
  resetDevice: new Element({
    $: 'resetDevice' as const,
    level: Level.PROPERTY as const,
    main: triggerElement(
      ValueTypeNg.NULL,
      new NullState(() => device.triggerReset())
    ),
  }),
});

export const identifyDevice = (indicator: Indicator) => ({
  identifyDevice: new Element({
    $: 'identifyDevice' as const,
    level: Level.PROPERTY as const,
    main: triggerElement(
      ValueTypeNg.NULL,
      new NullState(() =>
        indicator
          .request({
            blink: 10,
            mode: IndicatorMode.BLINK,
          })
          .catch(() => {
            // noop
          })
      )
    ),
  }),
});

export const trigger = <T extends string>(handler: () => void, topic: T) =>
  new Element({
    $: 'trigger' as const,
    level: Level.PROPERTY as const,
    main: triggerElement(ValueTypeNg.NULL, new NullState(handler), 'trigger'),
    topic,
  });

export class SceneMember<T> {
  constructor(
    public readonly observable: AnyWritableObservable<T>,
    public readonly onValue: T,
    public readonly offValue?: T
  ) {}
}

export const scene = <T extends string>(
  members: readonly SceneMember<unknown>[],
  topic: T
) => {
  const proxyObservables = members.map(
    <U>({ observable, onValue, offValue = onValue }: SceneMember<U>) =>
      new ProxyObservable<U, boolean>(
        observable,
        (value) => value === onValue,
        (on) => (observable.value = on ? onValue : offValue)
      )
  );

  const set = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    proxyObservables
  );

  return new Element({
    $: 'scene' as const,
    flip: triggerElement(ValueTypeNg.NULL, new NullState(() => set.flip())),
    level: Level.PROPERTY as const,
    main: setter(ValueTypeNg.BOOLEAN, set, undefined, 'scene'),
    topic,
  });
};

export const setOnline = (
  device: IpDevice,
  _: Persistence,
  initiallyOnline: boolean
) => {
  const state = new BooleanState(initiallyOnline);

  return {
    setOnline: new Element({
      $: 'setOnline' as const,
      flip: triggerElement(ValueTypeNg.NULL, new NullState(() => state.flip())),
      level: Level.PROPERTY as const,
      main: setter(ValueTypeNg.BOOLEAN, state),
    }),
  };
};
