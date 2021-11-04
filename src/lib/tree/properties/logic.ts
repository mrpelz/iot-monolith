/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  AnyWritableObservable,
  Observable,
  ReadOnlyObservable,
} from '../../observable.js';
import { BooleanState, NullState } from '../../state.js';
import {
  Levels,
  ParentRelation,
  ValueType,
  inherit,
  metadataStore,
} from '../main.js';
import { Timer } from '../../timer.js';

export function offTimer(time: number, setter: AnyWritableObservable<boolean>) {
  const enabled = new BooleanState(true);
  const active = new BooleanState(false);

  const triggerTime = new Observable<number | null>(null);
  const runoutTime = new Observable<number | null>(null);

  const timer = new Timer(time);

  enabled.observe((value) => {
    if (value) return;

    active.value = false;
  });

  active.observe((value) => {
    if (value) {
      timer.start();

      const now = Date.now();

      triggerTime.value = now;
      runoutTime.value = now + time;

      return;
    }

    triggerTime.value = null;
    runoutTime.value = null;

    if (!timer.isRunning) return;

    timer.stop();
  }, true);

  timer.observe(() => {
    setter.value = false;
    active.value = false;
  });
  setter.observe((value) => (active.value = enabled.value && value), true);

  const result = {
    _get: new ReadOnlyObservable(enabled),
    _set: enabled,
    active: (() => {
      const _active = {
        $: active,
        _get: new ReadOnlyObservable(active),
        _set: active,
        flip: (() => {
          const _flip = {
            _set: new NullState(() => active.flip()),
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
            _set: new NullState(() => (active.value = false)),
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
            _set: new NullState(() => (active.value = true)),
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

      metadataStore.set(_active, {
        actuated: inherit,
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.META_RELATION,
        type: 'actuator',
        valueType: ValueType.BOOLEAN,
      });

      return _active;
    })(),
    flip: (() => {
      const _flip = {
        _set: new NullState(() => enabled.flip()),
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
        _set: new NullState(() => (enabled.value = false)),
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
        _set: new NullState(() => (enabled.value = true)),
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
    runoutTime: (() => {
      const _runoutTime = {
        _get: new ReadOnlyObservable(runoutTime),
      };

      metadataStore.set(_runoutTime, {
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.META_RELATION,
        type: 'sensor',
        valueType: ValueType.NUMBER,
      });

      return _runoutTime;
    })(),
    triggerTime: (() => {
      const _triggerTime = {
        _get: new ReadOnlyObservable(triggerTime),
      };

      metadataStore.set(_triggerTime, {
        level: Levels.PROPERTY,
        parentRelation: ParentRelation.META_RELATION,
        type: 'sensor',
        valueType: ValueType.NUMBER,
      });

      return _triggerTime;
    })(),
  };

  metadataStore.set(result, {
    actuated: 'offTimer',
    level: Levels.PROPERTY,
    parentRelation: ParentRelation.META_RELATION,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
}
