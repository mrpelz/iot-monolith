/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  BooleanGroupStrategy,
  BooleanNullableStateGroup,
  BooleanState,
  BooleanStateGroup,
  NullState,
} from '../../state.js';
import {
  Levels,
  ParentRelation,
  ValueType,
  inherit,
  metadataStore,
} from '../main.js';
import {
  ObservableGroup,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import { Device } from '../../device/main.js';
import { Indicator } from '../../services/indicator.js';
import { Led } from '../../items/led.js';
import { Led as LedService } from '../../services/led.js';
import { Output } from '../../items/output.js';
import { Output as OutputService } from '../../services/output.js';

function actuatorStaleness<T>(
  state: ReadOnlyObservable<T | null>,
  setState: ReadOnlyObservable<T | null>,
  device: Device
) {
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
}

export function led(device: Device, index = 0, indicator = false) {
  const { actualBrightness, actualOn, setBrightness, setOn } = new Led(
    device.addService(new LedService(index)),
    indicator ? device.addService(new Indicator(0)) : undefined
  );

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
    off: (() => {
      const _off = {
        _set: new NullState(() => (setOn.value = false)),
      };

      metadataStore.set(_off, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _off;
    })(),
    on: (() => {
      const _on = {
        _set: new NullState(() => (setOn.value = true)),
      };

      metadataStore.set(_on, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _on;
    })(),
  };

  metadataStore.set(result, {
    actuated: 'light',
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
}

export function output(
  device: Device,
  index = 0,
  indicator = false,
  actuated = 'light'
) {
  const { actualState, setState } = new Output(
    device.addService(new OutputService(index)),
    indicator ? device.addService(new Indicator(0)) : undefined
  );

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
    off: (() => {
      const _off = {
        _set: new NullState(() => (setState.value = false)),
      };

      metadataStore.set(_off, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _off;
    })(),
    on: (() => {
      const _on = {
        _set: new NullState(() => (setState.value = true)),
      };

      metadataStore.set(_on, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _on;
    })(),
  };

  metadataStore.set(result, {
    actuated,
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
}

export function ledGrouping(
  lights: ReturnType<typeof led>[],
  actuated = 'light'
) {
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
    off: (() => {
      const _off = {
        _set: new NullState(() => (setOn.value = false)),
      };

      metadataStore.set(_off, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _off;
    })(),
    on: (() => {
      const _on = {
        _set: new NullState(() => (setOn.value = true)),
      };

      metadataStore.set(_on, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _on;
    })(),
  };

  metadataStore.set(result, {
    actuated,
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
}

export function outputGrouping(
  lights: (ReturnType<typeof output> | ReturnType<typeof led>)[],
  actuated = 'light'
) {
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
    off: (() => {
      const _off = {
        _set: new NullState(() => (set.value = false)),
      };

      metadataStore.set(_off, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _off;
    })(),
    on: (() => {
      const _on = {
        _set: new NullState(() => (set.value = true)),
      };

      metadataStore.set(_on, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _on;
    })(),
  };

  metadataStore.set(result, {
    actuated,
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
}

export function scene(handler: () => void, actuated = 'light') {
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
}
