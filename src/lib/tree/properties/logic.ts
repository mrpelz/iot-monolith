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

export function timer(
  timedOff: number,
  setter: AnyWritableObservable<boolean>
) {
  const offTimerEnabled = new BooleanState(true);
  const offTimerActive = new BooleanState(false);

  const triggerTime = new Observable<number | null>(null);
  const runoutTime = new Observable<number | null>(null);

  const offTimer = new Timer(timedOff);

  offTimerEnabled.observe((value) => {
    if (value) return;

    offTimerActive.value = false;
  });

  offTimerActive.observe((value) => {
    if (value) {
      offTimer.start();

      const now = Date.now();

      triggerTime.value = now;
      runoutTime.value = now + timedOff;

      return;
    }

    if (!offTimer.isRunning) return;

    offTimer.stop();

    triggerTime.value = null;
    runoutTime.value = null;
  }, true);

  offTimer.observe(() => {
    setter.value = false;
    offTimerActive.value = false;
  });
  setter.observe(
    (value) => (offTimerActive.value = offTimerEnabled.value && value),
    true
  );

  const result = {
    _get: new ReadOnlyObservable(offTimerEnabled),
    _set: offTimerEnabled,
    active: (() => {
      const _active = {
        $: offTimerActive,
        _get: new ReadOnlyObservable(offTimerActive),
        _set: offTimerActive,
        flip: (() => {
          const _flip = {
            _set: new NullState(() => offTimerActive.flip()),
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
            _set: new NullState(() => (offTimerActive.value = false)),
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
            _set: new NullState(() => (offTimerActive.value = true)),
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
    actuated: 'timer',
    level: Levels.PROPERTY,
    parentRelation: ParentRelation.META_RELATION,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
}
