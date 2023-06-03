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
import {
  Element,
  Level,
  ValueType as ValueTypeNg,
  symbolLevel,
  symbolMain,
} from '../main-ng.js';
import { Indicator, IndicatorMode } from '../../services/indicator.js';
import { Led } from '../../items/led.js';
import { Led as LedService } from '../../services/led.js';
import { Output } from '../../items/output.js';
import { Output as OutputService } from '../../services/output.js';
import { Persistence } from '../../persistence.js';
import { getter } from '../elements/getter.js';
import { setter } from '../elements/setter.js';
import { trigger as triggerNg } from '../elements/trigger.js';

const actuatorStaleness = <T>(
  state: AnyReadOnlyObservable<T | null>,
  setState: AnyWritableObservable<T>,
  device: Device
) => {
  const stale = new BooleanState(true);
  const loading = new BooleanState(true);

  return {
    actuatorStaleness: new Element(
      {
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
        [symbolLevel]: Level.PROPERTY,
      },
      () => {
        state.observe((value) => {
          if (setState.value === value) return;
          loading.value = true;
        }, true);

        state.observe((value) => {
          stale.value = value === null;

          if (value !== null && setState.value !== value) return;
          loading.value = false;
        }, true);
      }
    ),
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

  return new Element(
    {
      ...actuatorStaleness(actualBrightness, setBrightness, device),
      brightness: setter(ValueTypeNg.NUMBER, setBrightness, actualBrightness),
      flip: triggerNg(ValueTypeNg.NULL, new NullState(() => setOn.flip())),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: setter(ValueTypeNg.BOOLEAN, setOn, actualOn, 'on'),
      topic: 'lighting',
    },
    () => {
      if (persistence) {
        persistence.observe(
          `led/${device.transport.host}:${device.transport.port}/${index}`,
          setBrightness
        );
      }
    }
  );
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

  return new Element(
    {
      ...actuatorStaleness(actualState, setState, device),
      flip: triggerNg(ValueTypeNg.NULL, new NullState(() => setState.flip())),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: setter(ValueTypeNg.BOOLEAN, setState, actualState, 'on'),
      topic,
    },
    () => {
      if (persistence) {
        persistence.observe(
          `output/${device.transport.host}:${device.transport.port}/${index}`,
          setState
        );
      }
    }
  );
};

export const ledGrouping = (lights: ReturnType<typeof led>[]) => {
  const actualOn = new ReadOnlyObservable(
    new BooleanNullableStateGroup(
      BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
      lights.map((light) => light.$.m.$.i)
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
          new ReadOnlyProxyObservable(light.children.brightness.$.i, (value) =>
            value === null ? 0 : value
          )
      )
    )
  );

  const setOn = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    lights.map((light) => light.$.m.$.setState)
  );

  const setBrightness = new (class extends ObservableGroup<number> {
    protected _merge(): number {
      return this.values.reduce((a, b) => a + b, 0) / this.values.length;
    }
  })(
    0,
    lights.map((light) => light.children.brightness.$.setState)
  );

  return new Element({
    brightness: setter(ValueTypeNg.NUMBER, setBrightness, actualBrightness),
    flip: triggerNg(ValueTypeNg.NULL, new NullState(() => setOn.flip())),
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: setter(ValueTypeNg.BOOLEAN, setOn, actualOn, 'on'),
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
      outputs.map((outputElement) => outputElement.$.m.$.i)
    )
  );

  const setState = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    outputs.map((outputElement) => outputElement.$.m.$.setState)
  );

  return new Element({
    flip: triggerNg(ValueTypeNg.NULL, new NullState(() => setState.flip())),
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: setter(ValueTypeNg.BOOLEAN, setState, actualState, 'on'),
    topic,
  });
};

export const resetDevice = (device: Device) => ({
  resetDevice: new Element({
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: triggerNg(
      ValueTypeNg.NULL,
      new NullState(() => device.triggerReset())
    ),
  }),
});

export const identifyDevice = (indicator: Indicator) => ({
  identifyDevice: new Element({
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: triggerNg(
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
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: triggerNg(
      ValueTypeNg.NULL,
      new NullState(handler),
      'trigger'
    ),
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
    flip: triggerNg(ValueTypeNg.NULL, new NullState(() => set.flip())),
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: setter(ValueTypeNg.BOOLEAN, set, undefined, 'scene'),
    topic,
  });
};

export const setOnline = (
  device: IpDevice,
  _: Persistence,
  initiallyOnline = true
) => {
  const state = new BooleanState(initiallyOnline);

  return {
    setOnline: new Element(
      {
        flip: triggerNg(ValueTypeNg.NULL, new NullState(() => state.flip())),
        [symbolLevel]: Level.PROPERTY,
        [symbolMain]: setter(ValueTypeNg.BOOLEAN, state),
      },
      () => {
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

        // persistence.observe(
        //   `setOnline/${device.transport.host}:${device.transport.port}`,
        //   state
        // );
      }
    ),
  };
};
