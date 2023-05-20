/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { BooleanState, NullState } from '../../state.js';
import {
  Element,
  Level,
  ValueType,
  symbolInstance,
  symbolLevel,
  symbolMain,
} from '../main-ng.js';
import {
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import { Persistence } from '../../persistence.js';
import { ScheduleEpochPair } from '../../schedule.js';
import { Timer } from '../../timer.js';
import { getter } from '../elements/getter.js';
import { maxmin } from '../../number.js';
import { setter } from '../elements/setter.js';
import { trigger } from '../elements/trigger.js';

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

  return new Element({
    active: new Element({
      cancel: new Element({
        [symbolMain]: trigger(
          ValueType.NULL,
          new NullState(() => (active.value = false))
        ),
      }),
      reset: new Element({
        [symbolMain]: trigger(
          ValueType.NULL,
          new NullState(() => {
            if (!active.value) return;
            active.value = true;
          })
        ),
      }),
      [symbolInstance]: active,
      [symbolMain]: getter(ValueType.BOOLEAN, new ReadOnlyObservable(active)),
    }),
    flip: new Element({
      [symbolMain]: trigger(
        ValueType.NULL,
        new NullState(() => enabled.flip())
      ),
    }),
    runoutTime: new Element({
      [symbolMain]: getter(ValueType.NUMBER, runoutTime, 'date'),
    }),
    [symbolInstance]: timer,
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: setter(ValueType.BOOLEAN, enabled, undefined, 'on'),
    triggerTime: new Element({
      [symbolMain]: getter(
        ValueType.NUMBER,
        new ReadOnlyObservable(triggerTime),
        'date'
      ),
    }),
  });
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

  return new Element({
    cancel: new Element({
      [symbolMain]: trigger(ValueType.NULL, new NullState(() => cancel())),
    }),
    flip: new Element({
      [symbolMain]: trigger(
        ValueType.NULL,
        new NullState(() => enabled.flip())
      ),
    }),
    nextCompletion: new Element({
      [symbolMain]: getter(
        ValueType.NUMBER,
        new ReadOnlyProxyObservable<Date | null, number>(
          schedule.nextExecution,
          (date) => {
            if (!date) return 0;
            return date.getTime() + epoch;
          }
        ),
        'date'
      ),
    }),
    nextExecution: new Element({
      [symbolMain]: getter(
        ValueType.NUMBER,
        new ReadOnlyProxyObservable<Date | null, number>(
          schedule.nextExecution,
          (date) => date?.getTime() || 0
        ),
        'date'
      ),
    }),
    progress: new Element({
      [symbolMain]: getter(ValueType.NUMBER, new ReadOnlyObservable(progress)),
    }),
    [symbolLevel]: Level.PROPERTY,
    [symbolMain]: setter(ValueType.BOOLEAN, enabled, undefined, 'on'),
  });
};
