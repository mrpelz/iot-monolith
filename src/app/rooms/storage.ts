/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  BooleanGroupStrategy,
  combineBooleanState,
} from '../../lib/state-group.js';
import { BooleanState, NullState } from '../../lib/state.js';
import { Levels, metadataStore } from '../../lib/tree.js';
import { ackBlinkFromOff, ackBlinkFromOn } from '../orchestrations.js';
import { ev1527Transport, rfBridge } from '../bridges.js';
import { Logger } from '../../lib/log.js';
import { Timer } from '../../lib/timer.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527WindowSensor } from '../../lib/groupings/ev1527-window-sensor.js';
import { outputGrouping } from '../../lib/groupings/actuators.js';
import { shelly1 } from '../../lib/groupings/shelly1.js';
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
      ackBlinkFromOn(effectOn);
    } else {
      ackBlinkFromOff(effectOn);
    }
  });

  relayOn.observe((value) => (nodes.ceilingLight.relay._set.value = value));

  const result = {
    ...nodes,
    doorOpen,
    light: outputGrouping(on, undefined, timerStop),
  };

  metadataStore.set(result, {
    level: Levels.ROOM,
    name: 'storage',
  });

  return result;
}
