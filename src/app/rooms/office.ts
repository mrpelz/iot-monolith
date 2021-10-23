/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  BooleanGroupStrategy,
  combineBooleanState,
} from '../../lib/state-group.js';
import { BooleanState, NullState } from '../../lib/state.js';
import { Levels, metadataStore } from '../../lib/tree.js';
import { ackBlinkFromOff, ackBlinkFromOn } from '../orchestrations.js';
import { Logger } from '../../lib/log.js';
import { Timer } from '../../lib/timer.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527ButtonX1 } from '../../lib/groupings/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/groupings/ev1527-window-sensor.js';
import { h801 } from '../../lib/groupings/h801.js';
import { obiPlug } from '../../lib/groupings/obi-plug.js';
import { outputGrouping } from '../../lib/groupings/actuators.js';
import { shellyi3 } from '../../lib/groupings/shelly-i3.js';
import { sonoffBasic } from '../../lib/groupings/sonoff-basic.js';
import { timings } from '../timings.js';

export function office(logger: Logger) {
  const nodes = {
    ceilingLight: sonoffBasic(
      logger,
      timings,
      'office-ceilinglight.iot.wurstsalat.cloud'
    ),
    doorSensor: ev1527WindowSensor(logger, ev1527Transport, 55632),
    floodlight: obiPlug(
      logger,
      timings,
      'office-floodlight.iot.wurstsalat.cloud'
    ),
    wallswitch: shellyi3(
      logger,
      timings,
      'office-wallswitch.iot.wurstsalat.cloud'
    ),
    windowSensorRight: ev1527WindowSensor(logger, ev1527Transport, 839280),
    workbenchButton: ev1527ButtonX1(ev1527Transport, 903326, logger),
    workbenchLEDs: h801(
      logger,
      timings,
      'office-workbenchleds.iot.wurstsalat.cloud'
    ),
  };

  const { open: doorOpen } = nodes.doorSensor;
  const { open: windowOpenRight } = nodes.windowSensorRight;

  const on = new BooleanState(false);
  const effectOn = new BooleanState(true);

  const relayOn = combineBooleanState(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    false,
    on,
    effectOn
  );

  const timer = new Timer(epochs.hour);
  const timerStop = new NullState();

  nodes.wallswitch.button0.$.shortPress(() => on.flip());
  nodes.wallswitch.button0.$.longPress(() => timerStop.trigger());

  windowOpenRight._get.observe((value) => {
    if (!value) return;
    on.value = false;
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
    const wasOn = on.value;

    on.value = true;

    if (wasOn) {
      ackBlinkFromOn(effectOn);
    } else {
      ackBlinkFromOff(effectOn);
    }

    timer.stop();
  });

  relayOn.observe((value) => (nodes.ceilingLight.relay._set.value = value));

  const ledOn = new BooleanState(false);

  nodes.workbenchButton.$.observe(() => ledOn.flip());

  ledOn.observe((value) => (nodes.workbenchLEDs.led1._set.value = value));
  ledOn.observe((value) => (nodes.workbenchLEDs.led2._set.value = value));

  nodes.floodlight.button.$.shortPress(() =>
    nodes.floodlight.relay._set.flip()
  );

  const result = {
    ...nodes,
    doorOpen,
    led: outputGrouping(ledOn),
    light: outputGrouping(on, undefined, timerStop),
    windowOpenRight,
  };

  metadataStore.set(result, {
    level: Levels.ROOM,
    name: 'office',
  });

  return result;
}
