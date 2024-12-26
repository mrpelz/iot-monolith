/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import {
  outputGrouping,
  trigger,
} from '../../lib/tree/properties/actuators.js';
import { ev1527ButtonX4 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import fetch from 'node-fetch';
import { groups as hallwayGroups } from './hallway.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { persistence } from '../persistence.js';
import { promiseGuard } from '../../lib/promise.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { timings } from '../timings.js';

export const devices = {
  couchButton: ev1527ButtonX4(ev1527Transport, 822302, logger),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'livingroom-standinglamp.lan.wurstsalat.cloud'
  ),
  wallswitch: shellyi3(
    logger,
    persistence,
    timings,
    'diningroom-wallswitch.lan.wurstsalat.cloud'
  ),
};

export const instances = {
  couchButton: devices.couchButton.$,
  standingLampButton: devices.standingLamp.button.$,
  wallswitchBottom: devices.wallswitch.button1.$,
  wallswitchTop: devices.wallswitch.button0.$,
};

export const properties = {
  standingLamp: devices.standingLamp.relay,
};

export const groups = {
  allLights: outputGrouping([properties.standingLamp]),
};

export const scenes = {
  mediaOff: trigger(() => {
    promiseGuard(
      fetch('http://node-red.lan.wurstsalat.cloud:1880/media/off', {
        method: 'POST',
        timeout: 1000,
      })
    );
  }, 'media'),
  mediaOnOrSwitch: trigger(() => {
    promiseGuard(
      fetch('http://node-red.lan.wurstsalat.cloud:1880/media/on-or-switch', {
        method: 'POST',
        timeout: 1000,
      })
    );
  }, 'media'),
};

(async () => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../scenes.js'
  );

  const kitchenAdjecentsLightsOffKitchenBrightOn = () => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentBright._set.value = true;
  };

  const kitchenAdjecentsLightsOffKitchenChillaxOn = () => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
  };

  instances.couchButton.topLeft.observe(
    kitchenAdjecentsLightsOffKitchenChillaxOn
  );
  instances.couchButton.topRight.observe(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentBright._set.value = true;
  });
  instances.couchButton.bottomLeft.observe(() =>
    scenes.mediaOnOrSwitch._set.trigger()
  );
  instances.couchButton.bottomRight.observe(() =>
    scenes.mediaOff._set.trigger()
  );

  instances.standingLampButton.up(() => properties.standingLamp._set.flip());
  instances.standingLampButton.longPress(() =>
    kitchenAdjacentLights._set.flip()
  );

  instances.wallswitchBottom.up(() => properties.standingLamp._set.flip());
  instances.wallswitchBottom.longPress(
    kitchenAdjecentsLightsOffKitchenChillaxOn
  );

  instances.wallswitchTop.up(() => hallwayGroups.ceilingLight._set.flip());
  instances.wallswitchTop.longPress(kitchenAdjecentsLightsOffKitchenBrightOn);
})();

export const livingRoom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
    ...scenes,
  },
  {
    isDaylit: true,
    level: Levels.ROOM,
    name: 'livingRoom',
  }
);
