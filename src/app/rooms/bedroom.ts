/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree.js';
import { BooleanState } from '../../lib/state.js';
import { h801 } from '../../lib/groupings/h801.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/groupings/obi-plug.js';
import { outputGrouping } from '../../lib/groupings/actuators.js';
import { shelly1 } from '../../lib/groupings/shelly1.js';
import { shellyi3 } from '../../lib/groupings/shelly-i3.js';
import { timings } from '../timings.js';

export function bedroom() {
  const nodes = {
    ceilingLight: shelly1(
      logger,
      timings,
      'bedroom-ceilinglight.iot.wurstsalat.cloud'
    ),
    nightstandLEDs: h801(
      logger,
      timings,
      'bedroom-nightstandleds.iot.wurstsalat.cloud'
    ),
    rgbwLEDs: h801(logger, timings, 'bedroom-bedrgbwleds.iot.wurstsalat.cloud'),
    stoneLamp: obiPlug(
      logger,
      timings,
      'bedroom-stonelamp.iot.wurstsalat.cloud'
    ),
    wallswitchDoor: shellyi3(
      logger,
      timings,
      'bedroom-wallswitchdoor.iot.wurstsalat.cloud'
    ),
  };

  const ledsOn = new BooleanState(false);

  nodes.ceilingLight.button.$.shortPress(() =>
    nodes.ceilingLight.relay._set.flip()
  );

  nodes.wallswitchDoor.button0.$.shortPress(() =>
    nodes.stoneLamp.relay._set.flip()
  );
  nodes.wallswitchDoor.button1.$.shortPress(() =>
    nodes.ceilingLight.relay._set.flip()
  );
  nodes.wallswitchDoor.button2.$.shortPress(() => ledsOn.flip());

  nodes.stoneLamp.button.$.shortPress(() => nodes.stoneLamp.relay._set.flip());

  ledsOn.observe((value) => {
    nodes.nightstandLEDs.led0._set.value = value;
    nodes.nightstandLEDs.led1._set.value = value;

    nodes.rgbwLEDs.led3._set.value = value;
  });

  const result = {
    ...nodes,
    led: outputGrouping(ledsOn),
  };

  metadataStore.set(result, {
    level: Levels.ROOM,
    name: 'bedroom',
  });

  return result;
}
