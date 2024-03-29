/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { BooleanState, NullState } from '../../state.js';
import {
  Levels,
  ParentRelation,
  ValueType,
  addMeta,
  inherit,
} from '../main.js';
import {
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import { Persistence } from '../../persistence.js';
import { ScheduleEpochPair } from '../../schedule.js';
import { Timer } from '../../timer.js';
import { maxmin } from '../../number.js';

export const offTimer = (
  time: number,
  enableFromStart = true,
  persistenceSet?: [string, Persistence]
) => {
  const enabled = new BooleanState(enableFromStart);
  const active = new BooleanState(false);

  const triggerTime = new Observable<number | null>(null);
  const runoutTime = new ReadOnlyProxyObservable(triggerTime, (input) => {
    if (input === null) return null;
    return input + time;
  });

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
      triggerTime.value = Date.now();

      return;
    }

    triggerTime.value = null;

    if (!timer.isRunning) return;
    timer.stop();
  }, true);

  timer.observe(() => {
    active.value = false;
  });

  if (persistenceSet) {
    const [name, persistence] = persistenceSet;
    persistence.observe(`offTimer/${name}`, enabled);
  }

  return addMeta(
    {
      $: timer,
      _get: new ReadOnlyObservable(enabled),
      _set: enabled,
      active: (() =>
        addMeta(
          {
            $: active,
            _get: new ReadOnlyObservable(active),
            cancel: (() =>
              addMeta(
                { _set: new NullState(() => (active.value = false)) },
                {
                  actuated: inherit,
                  level: Levels.PROPERTY,
                  parentRelation: ParentRelation.CONTROL_TRIGGER,
                  type: 'actuator',
                  valueType: ValueType.NULL,
                }
              ))(),
            reset: (() =>
              addMeta(
                {
                  _set: new NullState(() => {
                    if (!active.value) return;
                    active.value = true;
                  }),
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
            actuated: inherit,
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.META_RELATION,
            type: 'actuator',
            valueType: ValueType.BOOLEAN,
          }
        ))(),
      flip: (() =>
        addMeta(
          { _set: new NullState(() => enabled.flip()) },
          {
            actuated: inherit,
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.CONTROL_TRIGGER,
            type: 'actuator',
            valueType: ValueType.NULL,
          }
        ))(),
      runoutTime: (() =>
        addMeta(
          { _get: runoutTime },
          {
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.META_RELATION,
            type: 'sensor',
            unit: 'date',
            valueType: ValueType.NUMBER,
          }
        ))(),
      triggerTime: (() =>
        addMeta(
          { _get: new ReadOnlyObservable(triggerTime) },
          {
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.META_RELATION,
            type: 'sensor',
            unit: 'date',
            valueType: ValueType.NUMBER,
          }
        ))(),
    },
    {
      actuated: 'offTimer',
      level: Levels.PROPERTY,
      parentRelation: ParentRelation.META_RELATION,
      type: 'actuator',
      valueType: ValueType.BOOLEAN,
    }
  );
};

export const scheduledRamp = (
  [schedule, epoch]: ScheduleEpochPair,
  refresh: number,
  handler: (progress: number) => void,
  persistenceSet?: [string, Persistence]
) => {
  const enabled = new BooleanState(false);
  schedule[enabled.value ? 'start' : 'stop']();

  const progress = new Observable(0);

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
    progress.value = maxmin(timeElapsed / epoch);

    handler(progress.value);

    if (progress.value === 1) {
      handleStop();
    }
  };

  schedule.addTask(() => {
    startTime = Date.now();
    timer = setInterval(handleRefresh, refresh);

    handleRefresh();
  });

  const cancel = () => {
    handleStop();
    handler(0);
  };

  enabled.observe((value) => {
    if (value) {
      schedule.start();
      return;
    }

    schedule.stop();
    cancel();
  });

  if (persistenceSet) {
    const [name, persistence] = persistenceSet;
    persistence.observe(`scheduledRamp/${name}`, enabled);
  }

  return addMeta(
    {
      _get: new ReadOnlyObservable(enabled),
      _set: enabled,
      cancel: (() =>
        addMeta(
          { _set: new NullState(() => cancel()) },
          {
            actuated: inherit,
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.CONTROL_TRIGGER,
            type: 'actuator',
            valueType: ValueType.NULL,
          }
        ))(),
      flip: (() =>
        addMeta(
          { _set: new NullState(() => enabled.flip()) },
          {
            actuated: inherit,
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.CONTROL_TRIGGER,
            type: 'actuator',
            valueType: ValueType.NULL,
          }
        ))(),
      nextCompletion: (() =>
        addMeta(
          {
            _get: new ReadOnlyProxyObservable<Date | null, number>(
              schedule.nextExecution,
              (date) => {
                if (!date) return 0;
                return date.getTime() + epoch;
              }
            ),
          },
          {
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.META_RELATION,
            type: 'sensor',
            unit: 'date',
            valueType: ValueType.NUMBER,
          }
        ))(),
      nextExecution: (() =>
        addMeta(
          {
            _get: new ReadOnlyProxyObservable<Date | null, number>(
              schedule.nextExecution,
              (date) => date?.getTime() || 0
            ),
          },
          {
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.META_RELATION,
            type: 'sensor',
            unit: 'date',
            valueType: ValueType.NUMBER,
          }
        ))(),
      progress: (() =>
        addMeta(
          {
            _get: new ReadOnlyObservable(progress),
          },
          {
            level: Levels.PROPERTY,
            parentRelation: ParentRelation.META_RELATION,
            type: 'sensor',
            valueType: ValueType.NUMBER,
          }
        ))(),
    },
    {
      actuated: 'scheduledRamp',
      level: Levels.PROPERTY,
      parentRelation: ParentRelation.META_RELATION,
      type: 'actuator',
      valueType: ValueType.BOOLEAN,
    }
  );
};
