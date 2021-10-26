/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  BooleanGroupStrategy,
  BooleanState,
  BooleanStateGroup,
  NullState,
} from '../state.js';
import {
  Levels,
  ParentRelation,
  ValueType,
  inherit,
  metadataStore,
} from '../tree.js';
import { ProxyObservable, ReadOnlyObservable } from '../observable.js';
import { Device } from '../device/main.js';
import { Indicator } from '../services/indicator.js';
import { Led } from '../items/led.js';
import { Led as LedService } from '../services/led.js';
import { Output } from '../items/output.js';
import { Output as OutputService } from '../services/output.js';

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
          new ProxyObservable((online) => !online, device.isOnline),
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
  const { actualBrightness, actualOn, setBrightness } = new Led(
    device.addService(new LedService(index)),
    indicator ? device.addService(new Indicator(0)) : undefined
  );

  const result = {
    _get: actualOn,
    _set: new NullState<boolean>(
      (value) => (setBrightness.value = value ? 255 : 0)
    ),
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
        _set: new NullState(
          () => (setBrightness.value = actualOn.value ? 0 : 255)
        ),
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
        _set: new NullState(() => (setBrightness.value = 0)),
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
        _set: new NullState(() => (setBrightness.value = 255)),
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

export function outputGrouping(
  on: BooleanState,
  actuated = 'light',
  timerStop?: NullState
) {
  const _outputGrouping = {
    _get: new ReadOnlyObservable(on),
    _set: on,
    flip: (() => {
      const _flip = {
        _set: new NullState(() => on.flip()),
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
        _set: new NullState(() => (on.value = false)),
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
        _set: new NullState(() => (on.value = true)),
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
    ...(timerStop
      ? {
          timerStop: (() => {
            const _timerStop = {
              _set: timerStop,
            };

            metadataStore.set(_timerStop, {
              actuated: 'timer',
              level: Levels.PROPERTY,
              parentRelation: ParentRelation.CONTROL_EXTENSION,
              type: 'actuator',
              valueType: ValueType.NULL,
            });

            return _timerStop;
          })(),
        }
      : undefined),
  };

  metadataStore.set(_outputGrouping, {
    actuated,
    level: Levels.PROPERTY,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return _outputGrouping;
}
