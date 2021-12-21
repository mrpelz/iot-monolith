/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { BooleanState, NullState } from '../../state.js';
import {
  Levels,
  ParentRelation,
  ValueType,
  inherit,
  metadataStore,
} from '../main.js';
import { Observable, ReadOnlyObservable } from '../../observable.js';
import { ScheduleEpochPair } from '../../schedule.js';
import { Timer } from '../../timer.js';

export function offTimer(time: number, enableFromStart = true) {
  const enabled = new BooleanState(enableFromStart);
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
      if (!enabled.value) {
        active.value = false;

        return;
      }

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
  });

  timer.observe(() => {
    active.value = false;
  });

  const result = {
    $: timer,
    _get: new ReadOnlyObservable(enabled),
    _set: enabled,
    active: (() => {
      const _active = {
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

export function scheduledRamp(
  [schedule, epoch]: ScheduleEpochPair,
  refresh: number,
  handler: (active: boolean, progress: number) => void
) {
  const enabled = new BooleanState(false);

  let startTime = 0;
  let timer: NodeJS.Timeout | null = null;

  const handleStop = () => {
    if (timer) {
      clearInterval(timer);
    }

    startTime = 0;
  };

  const handleRefresh = () => {
    if (!startTime) {
      handleStop();
      return;
    }

    const now = Date.now();
    const timeElapsed = now - startTime;
    const progress = timeElapsed / epoch;

    const active = progress <= 1;

    handler(active, progress);

    if (!active) {
      handleStop();
    }
  };

  schedule.addTask(() => {
    startTime = Date.now();
    timer = setInterval(handleRefresh, refresh);

    handleRefresh();
  });

  enabled.observe((value) => {
    if (value) {
      schedule.start();
      return;
    }

    handleStop();
    schedule.stop();

    handler(false, 0);
  });

  const result = {
    _get: new ReadOnlyObservable(enabled),
    _set: enabled,
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
  };

  metadataStore.set(result, {
    actuated: 'scheduledRamp',
    level: Levels.PROPERTY,
    parentRelation: ParentRelation.META_RELATION,
    type: 'actuator',
    valueType: ValueType.BOOLEAN,
  });

  return result;
}
