/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { logger } from '../logging.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { persistence } from '../persistence.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLightBack: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'hallway-ceilinglightback.lan.wurstsalat.cloud'
  ),
  ceilingLightFront: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'hallway-ceilinglightfront.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 55024),
  wallswitchBack: shellyi3(
    logger,
    persistence,
    timings,
    'hallway-wallswitchback.lan.wurstsalat.cloud'
  ),
  wallswitchFront: shellyi3(
    logger,
    persistence,
    timings,
    'hallway-wallswitchfront.lan.wurstsalat.cloud'
  ),
};

export const instances = {
  wallswitchBack: devices.wallswitchBack.button0.$,
  wallswitchFrontLeft: devices.wallswitchFront.button0.$,
  wallswitchFrontMiddle: devices.wallswitchFront.button1.$,
  wallswitchFrontRight: devices.wallswitchFront.button2.$,
  wallswitchMiddle: devices.wallswitchBack.button1.$,
};

const partialProperties = {
  ceilingLightBack: devices.ceilingLightBack.relay,
  ceilingLightFront: devices.ceilingLightFront.relay,
  door: addMeta(
    { open: devices.doorSensor.open },
    { level: Levels.AREA, name: 'entryDoor' }
  ),
};

export const groups = {
  allLights: outputGrouping([
    partialProperties.ceilingLightBack,
    partialProperties.ceilingLightFront,
  ]),
  ceilingLight: outputGrouping([
    partialProperties.ceilingLightBack,
    partialProperties.ceilingLightFront,
  ]),
};

export const properties = {
  ...partialProperties,
  entryDoorTimer: offTimer(epochs.minute * 3, undefined, [
    'hallway/entryDoorTimer',
    persistence,
  ]),
};

(async () => {
  const { all, allLights, kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentChillax } = await import('../scenes.js');

  instances.wallswitchBack.up(() => groups.ceilingLight._set.flip());
  instances.wallswitchBack.longPress(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
  });

  instances.wallswitchMiddle.up(() => groups.ceilingLight._set.flip());
  instances.wallswitchMiddle.longPress(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
  });

  instances.wallswitchFrontLeft.up(() =>
    properties.ceilingLightFront._set.flip()
  );
  instances.wallswitchFrontLeft.longPress(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
  });

  instances.wallswitchFrontMiddle.up(() =>
    properties.ceilingLightBack._set.flip()
  );
  instances.wallswitchFrontMiddle.longPress(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
  });

  instances.wallswitchFrontRight.up(() => (all._set.value = false));
  instances.wallswitchFrontRight.longPress(() => allLights._set.flip());

  properties.door.open._get.observe((value) => {
    if (!value) {
      if (!groups.ceilingLight._set.value) return;

      properties.entryDoorTimer.active.$.value = true;

      return;
    }

    properties.ceilingLightFront._set.value = true;
  });

  groups.ceilingLight._set.observe(
    () => (properties.entryDoorTimer.active.$.value = false),
    true
  );

  properties.entryDoorTimer.$.observe(() => {
    groups.ceilingLight._set.value = false;
  });
})();

export const hallway = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    isConnectingRoom: true,
    level: Levels.ROOM,
    name: 'hallway',
  }
);
