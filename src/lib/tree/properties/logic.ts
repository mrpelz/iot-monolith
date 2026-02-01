/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { maxmin } from '@mrpelz/misc-utils/number';
import {
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '@mrpelz/observable';
import { BooleanState, NullState } from '@mrpelz/observable/state';
import { Timer } from '@mrpelz/observable/timer';

import { Persistence } from '../../persistence.js';
import { ScheduleEpochPair } from '../../schedule.js';
import { Context } from '../context.js';
import { getter } from '../elements/getter.js';
import { setter } from '../elements/setter.js';
import { trigger } from '../elements/trigger.js';
import { Level, ValueType } from '../main.js';
import { InitFunction } from '../operations/init.js';

export const timer = (
  context: Context,
  time: number,
  enableFromStart = true,
) => {
  const $ = 'offTimer' as const;

  const { persistence } = context;

  const timer_ = new Timer(time, enableFromStart);

  const $init: InitFunction = (self, introspection) => {
    if (!persistence) return;

    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    persistence.observe(mainReference.pathString, timer_.isEnabled);
    persistence.observe(`${mainReference.pathString}.time`, timer_.time);
  };

  return {
    $,
    $init,
    active: {
      cancel: {
        main: trigger(ValueType.NULL, new NullState(() => timer_.stop())),
      },
      main: getter(ValueType.BOOLEAN, timer_.isActive),
      reset: {
        main: trigger(ValueType.NULL, new NullState(() => timer_.start())),
      },
    },
    flip: {
      main: trigger(
        ValueType.NULL,
        new NullState(() => timer_.isEnabled.flip()),
      ),
    },
    level: Level.PROPERTY as const,
    main: setter(ValueType.BOOLEAN, timer_.isEnabled, undefined, 'on'),
    runoutTime: { main: getter(ValueType.NUMBER, timer_.runoutTime, 'date') },
    state: timer_,
    time: {
      initialTime: time,
      isChanged: {
        main: getter(
          ValueType.BOOLEAN,
          new ReadOnlyProxyObservable(timer_.time, (value) => value !== time),
        ),
      },
      main: setter(ValueType.NUMBER, timer_.time),
      reset: {
        main: trigger(
          ValueType.NULL,
          new NullState(() => (timer_.time.value = time)),
        ),
      },
    },
    triggerTime: { main: getter(ValueType.NUMBER, timer_.triggerTime, 'date') },
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
  let timer_: NodeJS.Timeout | null = null;

  const handleStop = () => {
    if (timer_) {
      clearInterval(timer_);
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
    timer_ = setInterval(handleRefresh, refresh);

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
