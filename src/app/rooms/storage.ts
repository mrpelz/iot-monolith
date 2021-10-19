/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  BooleanGroupStrategy,
  combineBooleanState,
} from '../../lib/state-group.js';
import { BooleanState, NullState } from '../../lib/state.js';
import {
  Levels,
  ParentRelation,
  ValueType,
  inherit,
  metadataStore,
} from '../../lib/tree.js';
import { ev1527Transport, rfBridge } from '../bridges.js';
import { Logger } from '../../lib/log.js';
import { ReadOnlyObservable } from '../../lib/observable.js';
import { Timer } from '../../lib/timer.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527WindowSensor } from '../../lib/groupings/ev1527-window-sensor.js';
import { shelly1 } from '../../lib/groupings/shelly1.js';
import { sleep } from '../../lib/sleep.js';
import { timings } from '../timings.js';

export function storage(logger: Logger) {
  const nodes = {
    ceilingLight: shelly1(
      logger,
      timings,
      'storage-ceilinglight.iot.wurstsalat.cloud'
    ),
    doorSensor: ev1527WindowSensor(logger, ev1527Transport, 55632),
    rfBridge,
  };

  const { open: doorOpen } = nodes.doorSensor;

  const on = new BooleanState(false);
  const effectOn = new BooleanState(true);

  const relayOn = combineBooleanState(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    false,
    on,
    effectOn
  );

  const timer = new Timer(epochs.minute * 5);
  const timerStop = new NullState();

  nodes.ceilingLight.button.$.shortPress(() => on.flip());
  nodes.ceilingLight.button.$.longPress(() => timerStop.trigger());

  doorOpen._get.observe((value) => {
    if (!value) return;
    on.value = true;
  }, true);

  on.observe((value) => {
    if (value) {
      timer.start();
      return;
    }

    timer.stop();
  }, true);

  timer.observe(() => (on.value = false));

  timerStop.observe(async () => {
    on.value = true;
    timer.stop();

    if (on.value) {
      effectOn.value = false;
      await sleep(250);
      effectOn.value = true;
      await sleep(250);
      effectOn.value = false;
      await sleep(250);
      effectOn.value = true;
    } else {
      effectOn.value = true;
      await sleep(250);
      effectOn.value = false;
      await sleep(250);
      effectOn.value = true;
    }
  });

  relayOn.observe((value) => (nodes.ceilingLight.relay._set.value = value));

  const light = (() => {
    const _light = {
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
    };

    metadataStore.set(_light, {
      actuated: 'light',
      level: Levels.PROPERTY,
      type: 'actuator',
      valueType: ValueType.BOOLEAN,
    });

    return _light;
  })();

  const result = {
    ...nodes,
    doorOpen,
    light,
  };

  metadataStore.set(result, {
    level: Levels.ROOM,
    name: 'storage',
  });

  return result;
}
