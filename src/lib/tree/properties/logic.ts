/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { maxmin } from '../../number.js';
import {
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import { Persistence } from '../../persistence.js';
import { ScheduleEpochPair } from '../../schedule.js';
import { BooleanState, NullState } from '../../state.js';
import { Timer } from '../../timer.js';
import { Context } from '../context.js';
import { getter } from '../elements/getter.js';
import { setter } from '../elements/setter.js';
import { trigger } from '../elements/trigger.js';
import { Level, ValueType } from '../main.js';
import { InitFunction } from '../operations/init.js';
import { Introspection } from '../operations/introspection.js';
import { Metrics } from '../operations/metrics.js';

export const offTimer = (
  context: Context,
  time: number,
  enableFromStart = true,
) => {
  const $ = 'offTimer' as const;

  const { persistence } = context;

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

  const $init: InitFunction = (self, introspection) => {
    if (!persistence) return;

    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    persistence.observe(Introspection.pathString(mainReference.path), enabled);

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      `${$}_actual`,
      'is timer enabled?',
      enabled,
      labels,
    );

    context.metrics.addMetric(
      `${$}_set`,
      'is timer currently running?',
      active,
      {
        runoutTime: new ReadOnlyProxyObservable(runoutTime, (value) =>
          value === null ? '' : value,
        ),
        triggerTime: new ReadOnlyProxyObservable(triggerTime, (value) =>
          value === null ? '' : value,
        ),
        ...labels,
      },
    );
  };

  return {
    $,
    $init,
    active: {
      cancel: {
        main: trigger(
          ValueType.NULL,
          new NullState(() => (active.value = false)),
        ),
      },
      main: getter(ValueType.BOOLEAN, new ReadOnlyObservable(active)),
      reset: {
        main: trigger(
          ValueType.NULL,
          new NullState(() => {
            if (!active.value) return;
            active.value = true;
          }),
        ),
      },
      state: active,
    },
    flip: {
      main: trigger(ValueType.NULL, new NullState(() => enabled.flip())),
    },
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, enabled, undefined, 'on'),
    runoutTime: {
      main: getter(ValueType.NUMBER, runoutTime, 'date'),
    },
    state: timer,
    triggerTime: {
      main: getter(
        ValueType.NUMBER,
        new ReadOnlyObservable(triggerTime),
        'date',
      ),
    },
  };
};

export const scheduledRamp = (
  [schedule, epoch]: ScheduleEpochPair,
  refresh: number,
  handler: (progress: number) => void,
  persistenceSet?: [string, Persistence],
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

  return {
    $: 'scheduledRamp' as const,
    cancel: {
      main: trigger(ValueType.NULL, new NullState(() => cancel())),
    },
    flip: {
      main: trigger(ValueType.NULL, new NullState(() => enabled.flip())),
    },
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, enabled, undefined, 'on'),
    nextCompletion: {
      main: getter(
        ValueType.NUMBER,
        new ReadOnlyProxyObservable<Date | null, number>(
          schedule.nextExecution,
          (date) => {
            if (!date) return 0;
            return date.getTime() + epoch;
          },
        ),
        'date',
      ),
    },
    nextExecution: {
      main: getter(
        ValueType.NUMBER,
        new ReadOnlyProxyObservable<Date | null, number>(
          schedule.nextExecution,
          (date) => date?.getTime() || 0,
        ),
        'date',
      ),
    },
    progress: {
      main: getter(ValueType.NUMBER, new ReadOnlyObservable(progress)),
    },
  };
};
