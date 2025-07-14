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
import { Metrics } from '../operations/metrics.js';

export const offTimer = (
  context: Context,
  time: number,
  enableFromStart = true,
) => {
  const $ = 'offTimer' as const;

  const { persistence } = context;

  const timer = new Timer(time, enableFromStart);

  const $init: InitFunction = (self, introspection) => {
    if (!persistence) return;

    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    persistence.observe(mainReference.pathString, timer.isEnabled);

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    context.metrics.addMetric(
      `${$}_enabled`,
      'is timer enabled?',
      timer.isEnabled,
      labels,
    );

    context.metrics.addMetric(
      `${$}_active`,
      'is timer currently running?',
      timer.isActive,
      labels,
    );

    context.metrics.addMetric(
      `${$}_triggerTime`,
      'when was timer triggered?',
      timer.triggerTime,
      labels,
    );

    context.metrics.addMetric(
      `${$}_runoutTime`,
      'when will timer run out?',
      timer.runoutTime,
      labels,
    );
  };

  return {
    $,
    $init,
    active: {
      cancel: {
        main: trigger(ValueType.NULL, new NullState(() => timer.stop())),
      },
      main: getter(ValueType.BOOLEAN, timer.isActive),
      reset: {
        main: trigger(ValueType.NULL, new NullState(() => timer.start())),
      },
      state: timer.isActive,
    },
    flip: {
      main: trigger(
        ValueType.NULL,
        new NullState(() => timer.isEnabled.flip()),
      ),
    },
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, timer.isEnabled, undefined, 'on'),
    runoutTime: {
      main: getter(ValueType.NUMBER, timer.runoutTime, 'date'),
    },
    state: timer,
    triggerTime: {
      main: getter(ValueType.NUMBER, timer.triggerTime, 'date'),
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
