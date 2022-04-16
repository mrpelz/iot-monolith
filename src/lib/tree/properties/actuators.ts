/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  AnyReadOnlyObservable,
  ObservableGroup,
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
import { Indicator, IndicatorMode } from '../../services/indicator.js';
import {
  Levels,
  ParentRelation,
  ValueType,
  inherit,
  metadataStore,
} from '../main.js';
import { Led } from '../../items/led.js';
import { Led as LedService } from '../../services/led.js';
import { Output } from '../../items/output.js';
import { Output as OutputService } from '../../services/output.js';
import { Persistence } from '../../persistence.js';

const actuatorStaleness = <T>(
  state: AnyReadOnlyObservable<T | null>,
  setState: AnyReadOnlyObservable<T | null>,
  device: Device
) => {
  const stale = new BooleanState(true);
  const loading = new BooleanState(true);

  state.observe((value) => {
    if (setState.value === value) return;
    loading.value = true;
  }, true);

  state.observe((value) => {
    stale.value = value === null;

    if (value !== null && setState.value !== value) return;
    loading.value = false;
  }, true);

  return {
    loading: (() => {
      const result = {
        _get: new ReadOnlyObservable(loading),
      };

      metadataStore.set(result, {
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.DATA_QUALIFIER,
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      });

      return result;
    })(),
    stale: (() => {
      const result = {
        _get: new BooleanStateGroup(BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE, [
          stale,
          // invert online state to be true if device is offline
          new ReadOnlyProxyObservable(device.isOnline, (online) => !online),
        ]),
      };

      metadataStore.set(result, {
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.DATA_QUALIFIER,
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      });

      return result;
    })(),
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

  if (persistence) {
    persistence.observe(
      `led/${device.transport.host}:${device.transport.port}/${index}`,
      setBrightness
    );
  }

  const result = {
    _get: actualOn,
    _set: setOn,
    ...actuatorStaleness(
      actualBrightness,
      new ReadOnlyObservable(setBrightness),
      device
    ),
    brightness: (() => {
      const _brightness = {
        _get: actualBrightness,
        _set: setBrightness,
      };

      metadataStore.set(_brightness, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_EXTENSION,
        type: 'actuator',
        valueType: ValueType.NUMBER,
      });

      return _brightness;
    })(),
    flip: (() => {
      const _flip = {
        _set: new NullState(() => setOn.flip()),
      };

      metadataStore.set(_flip, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _flip;
    })(),
  };

  metadataStore.set(result, {
    actuated: 'lighting',
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
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

  const result = {
    _get: actualState,
    _set: setState,
    ...actuatorStaleness(actualState, new ReadOnlyObservable(setState), device),
    flip: (() => {
      const _flip = {
        _set: new NullState(() => setState.flip()),
      };

      metadataStore.set(_flip, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _flip;
    })(),
  };

  metadataStore.set(result, {
    actuated,
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
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
        return (
          this.values.reduce((a, b) => {
            return a + b;
          }, 0) / this.values.length
        );
      }
    })(
      0,
      lights.map(
        (light) =>
          new ReadOnlyProxyObservable(light.brightness._get, (value) => {
            return value === null ? 0 : value;
          })
      )
    )
  );

  const setOn = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    lights.map((light) => light._set)
  );

  const setBrightness = new (class extends ObservableGroup<number> {
    protected _merge(): number {
      return (
        this.values.reduce((a, b) => {
          return a + b;
        }, 0) / this.values.length
      );
    }
  })(
    0,
    lights.map((light) => light.brightness._set)
  );

  const result = {
    _get: actualOn,
    _set: setOn,
    brightness: (() => {
      const _brightness = {
        _get: actualBrightness,
        _set: setBrightness,
      };

      metadataStore.set(_brightness, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_EXTENSION,
        type: 'actuator',
        valueType: ValueType.NUMBER,
      });

      return _brightness;
    })(),
    flip: (() => {
      const _flip = {
        _set: new NullState(() => setOn.flip()),
      };

      metadataStore.set(_flip, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _flip;
    })(),
  };

  metadataStore.set(result, {
    actuated: 'lighting',
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
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

  const result = {
    _get: actual,
    _set: set,
    flip: (() => {
      const _flip = {
        _set: new NullState(() => set.flip()),
      };

      metadataStore.set(_flip, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _flip;
    })(),
  };

  metadataStore.set(result, {
    actuated,
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
};

export const resetDevice = (device: Device) => ({
  resetDevice: (() => {
    const result = {
      _set: new NullState(() => device.triggerReset()),
    };

    metadataStore.set(result, {
      level: Levels.PROPERTY,
      type: 'actuator',
      valueType: ValueType.NULL,
    });

    return result;
  })(),
});

export const identifyDevice = (indicator: Indicator) => ({
  identifyDevice: (() => {
    const result = {
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
    };

    metadataStore.set(result, {
      level: Levels.PROPERTY,
      type: 'actuator',
      valueType: ValueType.NULL,
    });

    return result;
  })(),
});

export const scene = (handler: () => void, actuated: string) => {
  const result = {
    _set: new NullState(() => handler()),
  };

  metadataStore.set(result, {
    actuated,
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.NULL,
  });

  return result;
};
