/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../../lib/tree/main-ng.js';
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
  wallswitchBack: devices.wallswitchBack.button0.instance,
  wallswitchFrontLeft: devices.wallswitchFront.button0.instance,
  wallswitchFrontMiddle: devices.wallswitchFront.button1.instance,
  wallswitchFrontRight: devices.wallswitchFront.button2.instance,
  wallswitchMiddle: devices.wallswitchBack.button1.instance,
};

const partialProperties = {
  ceilingLightBack: devices.ceilingLightBack.relay,
  ceilingLightFront: devices.ceilingLightFront.relay,
  door: element({
    name: 'entryDoor',
    open: devices.doorSensor.open,
    [symbolLevel]: Level.AREA,
  }),
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
  const { all, allLights, kitchenAdjacentLights } = await import(
    '../groups.js'
  );
  const { kitchenAdjacentChillax } = await import('../scenes.js');

  instances.wallswitchBack.up(() =>
    groups.ceilingLight.flip.instance.trigger()
  );

  instances.wallswitchMiddle.up(() =>
    groups.ceilingLight.flip.instance.trigger()
  );

  instances.wallswitchFrontLeft.up(() =>
    properties.ceilingLightFront.flip.instance.trigger()
  );
  instances.wallswitchFrontLeft.longPress(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
  });

  instances.wallswitchFrontMiddle.up(() =>
    properties.ceilingLightBack.flip.instance.trigger()
  );
  instances.wallswitchFrontRight.up(() => (all.main.setState.value = false));
  instances.wallswitchFrontRight.longPress(() =>
    allLights.flip.instance.trigger()
  );

  properties.door.open.main.instance.observe((value) => {
    if (!value) {
      if (!groups.ceilingLight.main.instance.value) return;

      properties.entryDoorTimer.active.instance.value = true;

      return;
    }

    properties.ceilingLightFront.main.setState.value = true;
  });

  groups.ceilingLight.main.setState.observe(
    () => (properties.entryDoorTimer.active.instance.value = false),
    true
  );

  properties.entryDoorTimer.instance.observe(() => {
    groups.ceilingLight.main.setState.value = false;
  });
})();

export const hallway = element({
  devices: element({ ...devices, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
