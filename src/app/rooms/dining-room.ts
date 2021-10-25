/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree.js';
import { h801 } from '../../lib/groupings/h801.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/groupings/obi-plug.js';
import { shellyi3 } from '../../lib/groupings/shelly-i3.js';
import { sonoffBasic } from '../../lib/groupings/sonoff-basic.js';
import { timings } from '../timings.js';

export function diningRoom() {
  const nodes = {
    ceilingLight: sonoffBasic(
      logger,
      timings,
      'diningroom-ceilinglight.iot.wurstsalat.cloud'
    ),
    fan: obiPlug(logger, timings, 'diningroom-fan.iot.wurstsalat.cloud'),
    kallaxLEDs: h801(
      logger,
      timings,
      'diningroom-kallaxleds.iot.wurstsalat.cloud'
    ),
    standingLamp: obiPlug(
      logger,
      timings,
      'diningroom-standinglamp.iot.wurstsalat.cloud'
    ),
    tableLight: sonoffBasic(
      logger,
      timings,
      'diningroom-tablelight.iot.wurstsalat.cloud'
    ),
    wallswitch: shellyi3(
      logger,
      timings,
      'diningroom-wallswitch.iot.wurstsalat.cloud'
    ),
  };

  nodes.wallswitch.button0.$.shortPress(() =>
    nodes.ceilingLight.relay._set.flip()
  );
  nodes.wallswitch.button1.$.shortPress(() =>
    nodes.tableLight.relay._set.flip()
  );

  nodes.standingLamp.button.$.shortPress(() =>
    nodes.standingLamp.relay._set.flip()
  );

  nodes.fan.button.$.shortPress(() => nodes.fan.relay._set.flip());

  const result = {
    ...nodes,
  };

  metadataStore.set(result, {
    level: Levels.ROOM,
    name: 'diningRoom',
  });

  return result;
}
