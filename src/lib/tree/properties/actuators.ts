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
import {
  Levels,
  ParentRelation,
  ValueType,
  addMeta,
  inherit,
} from '../main.js';
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
  setState: AnyReadOnlyObservable<T | null>,
  device: Device
) => {
  const stale = new BooleanState(true);
  const loading = new BooleanState(true);

  return new Element(
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
  );
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
      brightness: setter(
        ValueTypeNg.NUMBER,
        setBrightness,
        actualBrightness,
        'brightness',
        'lighting'
      ),
      flip: triggerNg(
        ValueTypeNg.NULL,
        new NullState(() => setOn.flip()),
        'flip',
        'lighting'
      ),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: setter(
        ValueTypeNg.BOOLEAN,
        setOn,
        actualOn,
        'on',
        'lighting'
      ),
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

export const output = (
  device: IpDevice,
  index = 0,
  actuated: string,
  indicator?: Indicator,
  persistence?: Persistence
) => {
  const { actualState, setState } = new Output(
    device.addService(new OutputService(index)),
    indicator
  );

  if (persistence) {
    persistence.observe(
      `output/${device.transport.host}:${device.transport.port}/${index}`,
      setState
    );
  }

  return addMeta(
    {
      _get: actualState,
      _set: setState,
      ...actuatorStaleness(
        actualState,
        new ReadOnlyObservable(setState),
        device
      ),
      flip: (() =>
        addMeta(
          { _set: new NullState(() => setState.flip()) },
          {
            actuated: inherit,
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.CONTROL_TRIGGER,
            type: 'actuator',
            valueType: ValueType.NULL,
          }
        ))(),
    },
    {
      actuated,
      level: Levels.PROPERTY,
      type: 'actuator',
      valueType: ValueType.BOOLEAN,
    }
  );
};

export const ledGrouping = (lights: ReturnType<typeof led>[]) => {
  const actualOn = new ReadOnlyObservable(
    new BooleanNullableStateGroup(
      BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
      lights.map((light) => light._get)
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
          new ReadOnlyProxyObservable(light.brightness._get, (value) =>
            value === null ? 0 : value
          )
      )
    )
  );

  const setOn = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    lights.map((light) => light._set)
  );

  const setBrightness = new (class extends ObservableGroup<number> {
    protected _merge(): number {
      return this.values.reduce((a, b) => a + b, 0) / this.values.length;
    }
  })(
    0,
    lights.map((light) => light.brightness._set)
  );

  return addMeta(
    {
      _get: actualOn,
      _set: setOn,
      brightness: (() =>
        addMeta(
          {
            _get: actualBrightness,
            _set: setBrightness,
          },
          {
            actuated: inherit,
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.CONTROL_EXTENSION,
            type: 'actuator',
            valueType: ValueType.NUMBER,
          }
        ))(),
      flip: (() =>
        addMeta(
          {
            _set: new NullState(() => setOn.flip()),
          },
          {
            actuated: inherit,
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.CONTROL_TRIGGER,
            type: 'actuator',
            valueType: ValueType.NULL,
          }
        ))(),
    },
    {
      actuated: 'lighting',
      level: Levels.PROPERTY,
      type: 'actuator',
      valueType: ValueType.BOOLEAN,
    }
  );
};

export const outputGrouping = (
  lights: (ReturnType<typeof output> | ReturnType<typeof led>)[],
  actuated = 'lighting'
) => {
  const actual = new ReadOnlyObservable(
    new BooleanNullableStateGroup(
      BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
      lights.map((light) => light._get)
    )
  );

  const set = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    lights.map((light) => light._set)
  );

  return addMeta(
    {
      _get: actual,
      _set: set,
      flip: (() =>
        addMeta(
          { _set: new NullState(() => set.flip()) },
          {
            actuated: inherit,
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.CONTROL_TRIGGER,
            type: 'actuator',
            valueType: ValueType.NULL,
          }
        ))(),
    },
    {
      actuated,
      level: Levels.PROPERTY,
      type: 'actuator',
      valueType: ValueType.BOOLEAN,
    }
  );
};

export const resetDevice = (device: Device) => ({
  resetDevice: (() =>
    addMeta(
      { _set: new NullState(() => device.triggerReset()) },
      {
        level: Levels.PROPERTY,
        type: 'actuator',
        valueType: ValueType.NULL,
      }
    ))(),
});

export const identifyDevice = (indicator: Indicator) => ({
  identifyDevice: (() =>
    addMeta(
      {
        _set: new NullState(() =>
          indicator
            .request({
              blink: 10,
              mode: IndicatorMode.BLINK,
            })
            .catch(() => {
              // noop
            })
        ),
      },
      {
        level: Levels.PROPERTY,
        type: 'actuator',
        valueType: ValueType.NULL,
      }
    ))(),
});

export const trigger = (handler: () => void, actuated: string) =>
  addMeta(
    { _set: new NullState(() => handler()) },
    {
      actuated,
      level: Levels.PROPERTY,
      type: 'actuator',
      valueType: ValueType.NULL,
    }
  );

export class SceneMember<T> {
  constructor(
    public readonly observable: AnyWritableObservable<T>,
    public readonly onValue: T,
    public readonly offValue?: T
  ) {}
}

export const scene = (
  members: readonly SceneMember<unknown>[],
  actuated: string
) => {
  const proxyObservables = members.map(
    <T>({ observable, onValue, offValue = onValue }: SceneMember<T>) =>
      new ProxyObservable<T, boolean>(
        observable,
        (value) => value === onValue,
        (on) => (observable.value = on ? onValue : offValue)
      )
  );

  const set = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    proxyObservables
  );

  return addMeta(
    {
      _get: new ReadOnlyObservable(set),
      _set: set,
      flip: (() =>
        addMeta(
          { _set: new NullState(() => set.flip()) },
          {
            actuated: inherit,
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.CONTROL_TRIGGER,
            type: 'actuator',
            valueType: ValueType.NULL,
          }
        ))(),
    },
    {
      actuated,
      level: Levels.PROPERTY,
      type: 'actuator',
      valueType: ValueType.BOOLEAN,
    }
  );
};

export const setOnline = (
  device: IpDevice,
  _: Persistence,
  initiallyOnline = true
) => {
  const state = new BooleanState(initiallyOnline);

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

  return {
    setOnline: addMeta(
      {
        _get: new ReadOnlyObservable(state),
        _set: state,
        flip: (() =>
          addMeta(
            { _set: new NullState(() => state.flip()) },
            {
              actuated: inherit,
              level: Levels.PROPERTY,
              parentRelation: ParentRelation.CONTROL_TRIGGER,
              type: 'actuator',
              valueType: ValueType.NULL,
            }
          ))(),
      },
      {
        actuated: 'isOnline',
        level: Levels.PROPERTY,
        type: 'actuator',
        valueType: ValueType.BOOLEAN,
      }
    ),
  };
};
