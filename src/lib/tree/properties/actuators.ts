/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  AnyWritableObservable,
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
import {
  Levels,
  ParentRelation,
  ValueType,
  inherit,
  metadataStore,
} from '../main.js';
import { Device } from '../../device/main.js';
import { Indicator } from '../../services/indicator.js';
import { Led } from '../../items/led.js';
import { Led as LedService } from '../../services/led.js';
import { Output } from '../../items/output.js';
import { Output as OutputService } from '../../services/output.js';
import { Timer } from '../../timer.js';

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
  const {
    actualBrightness,
    actualOn,
    setBrightness,
    setOn: _setOn,
  } = new Led(
    device.addService(new LedService(index)),
    indicator ? device.addService(new Indicator(0)) : undefined
  );

  const setOn = new BooleanState(false);
  const effectState = new BooleanState(true);

  const _combined = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    [setOn, effectState]
  );

  _combined.observe((value) => (_setOn.value = value));

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
    effectState: {
      $: effectState,
    },
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
  const { actualState, setState: _setState } = new Output(
    device.addService(new OutputService(index)),
    indicator ? device.addService(new Indicator(0)) : undefined
  );

  const setState = new BooleanState(false);
  const effectState = new BooleanState(true);

  const _combined = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    [setState, effectState]
  );

  _combined.observe((value) => (_setState.value = value));

  const result = {
    _get: actualState,
    _set: setState,
    ...actuatorStaleness(actualState, new ReadOnlyObservable(setState), device),
    effectState: {
      $: effectState,
    },
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

export function timer(
  timedOff: number,
  setter: AnyWritableObservable<boolean>
) {
  const offTimerEnabled = new BooleanState(true);
  const offTimerActive = new BooleanState(false);

  const offTimer = new Timer(timedOff);

  offTimerEnabled.observe((value) => {
    if (value) {
      offTimer.enable();
      return;
    }

    offTimerActive.value = false;
    offTimer.disable();
  });

  offTimerActive.observe((value) => {
    if (value) {
      offTimer.start();
      return;
    }

    if (!offTimer.isRunning) return;

    offTimer.stop();
  }, true);

  offTimer.observe(() => (setter.value = false));
  setter.observe((value) => (offTimerActive.value = value), true);

  const result = {
    $: offTimer,
    _get: new ReadOnlyObservable(offTimerEnabled),
    _set: offTimerEnabled,
    active: (() => {
      const _active = {
        $: offTimerActive,
        _get: new ReadOnlyObservable(offTimerActive),
        _set: new NullState(() => (offTimerActive.value = false)),
      };

      metadataStore.set(_active, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.CONTROL_TRIGGER,
        type: 'actuator',
        valueType: ValueType.NULL,
      });

      return _active;
    })(),
    flip: (() => {
      const _flip = {
        _set: new NullState(() => offTimerEnabled.flip()),
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
        _set: new NullState(() => (offTimerEnabled.value = false)),
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
        _set: new NullState(() => (offTimerEnabled.value = true)),
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
    actuated: 'timer',
    level: Levels.PROPERTY,
    parentRelation: ParentRelation.META_RELATION,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return {
    offTimer: result,
  };
}

export function ledGrouping(
  lights: ReturnType<typeof led>[],
  actuated = 'light',
  timedOff?: number
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
    ...(timedOff ? timer(timedOff, setOn) : undefined),
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
  actuated = 'light',
  timedOff?: number
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
    ...(timedOff ? timer(timedOff, set) : undefined),
  };

  metadataStore.set(result, {
    actuated,
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
}
