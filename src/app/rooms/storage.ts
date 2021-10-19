/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { BooleanState, NullState } from '../../lib/state.js';
import {
  Levels,
  ParentRelation,
  ValueType,
  inherit,
  metadataStore,
} from '../../lib/tree.js';
import { Logger } from '../../lib/log.js';
import { ReadOnlyObservable } from '../../lib/observable.js';
import { Timer } from '../../lib/timer.js';
import { epochs } from '../../lib/epochs.js';
import { rfBridge } from '../bridges.js';
import { shelly1 } from '../../lib/groupings/shelly1.js';
import { timings } from '../timings.js';

export function storage(logger: Logger) {
  const nodes = {
    ceilingLight: shelly1(
      logger,
      timings,
      'storage-ceilinglight.iot.wurstsalat.cloud'
    ),
    rfBridge,
  };

  const on = new BooleanState(false);
  const timer = new Timer(epochs.minute * 30);

  nodes.ceilingLight.button.$.shortPress(() => on.flip());

  on.observe((value) => {
    nodes.ceilingLight.relay._set.value = value;

    if (value) {
      timer.start();
      return;
    }

    timer.stop();
  });

  timer.observe(() => (on.value = false));

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
    light,
  };

  metadataStore.set(result, {
    level: Levels.ROOM,
    name: 'storage',
  });

  return result;
}
