/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export function livingRoom() {
  const nodes = {
    ceilingLight: sonoffBasic(
      logger,
      timings,
      'livingroom-ceilinglight.iot.wurstsalat.cloud'
    ),
    fan: obiPlug(logger, timings, 'livingroom-fan.iot.wurstsalat.cloud'),
    standingLamp: obiPlug(
      logger,
      timings,
      'livingroom-standinglamp.iot.wurstsalat.cloud'
    ),
    wallswitch: shellyi3(
      logger,
      timings,
      'livingroom-wallswitch.iot.wurstsalat.cloud'
    ),
  };

  nodes.wallswitch.button0.$.shortPress(() =>
    nodes.ceilingLight.relay._set.flip()
  );
  nodes.wallswitch.button1.$.shortPress(() =>
    nodes.standingLamp.relay._set.flip()
  );
  nodes.wallswitch.button2.$.shortPress(() => nodes.fan.relay._set.flip());

  nodes.standingLamp.button.$.shortPress(() =>
    nodes.standingLamp.relay._set.flip()
  );

  nodes.fan.button.$.shortPress(() => nodes.fan.relay._set.flip());

  const result = {
    ...nodes,
  };

  metadataStore.set(result, {
    isDaylit: true,
    level: Levels.ROOM,
    name: 'livingRoom',
  });

  return result;
}
