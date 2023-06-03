/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level, symbolLevel } from '../../lib/tree/main-ng.js';
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
  wallswitchBack: devices.wallswitchBack.$.button0.$.i,
  wallswitchFrontLeft: devices.wallswitchFront.$.button0.$.i,
  wallswitchFrontMiddle: devices.wallswitchFront.$.button1.$.i,
  wallswitchFrontRight: devices.wallswitchFront.$.button2.$.i,
  wallswitchMiddle: devices.wallswitchBack.$.button1.$.i,
};

const partialProperties = {
  ceilingLightBack: devices.ceilingLightBack.$.relay,
  ceilingLightFront: devices.ceilingLightFront.$.relay,
  door: new Element({
    name: 'entryDoor',
    open: devices.doorSensor.$.open,
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
  const { all, allLights } = await import('../groups.js');

  instances.wallswitchBack.up(() => groups.ceilingLight.$.flip.$.i.trigger());

  instances.wallswitchMiddle.up(() => groups.ceilingLight.$.flip.$.i.trigger());

  instances.wallswitchFrontLeft.up(() =>
    properties.ceilingLightFront.$.flip.$.i.trigger()
  );
  instances.wallswitchFrontMiddle.up(() =>
    properties.ceilingLightBack.$.flip.$.i.trigger()
  );
  instances.wallswitchFrontRight.up(() => (all.$.m.$.setState.value = false));
  instances.wallswitchFrontRight.longPress(() =>
    allLights.$.flip.$.i.trigger()
  );

  properties.door.$.open.$.m.$.i.observe((value) => {
    if (!value) {
      if (!groups.ceilingLight.$.m.$.i.value) return;

      properties.entryDoorTimer.$.active.$.i.value = true;

      return;
    }

    properties.ceilingLightFront.$.m.$.setState.value = true;
  });

  groups.ceilingLight.$.m.$.setState.observe(
    () => (properties.entryDoorTimer.$.active.$.i.value = false),
    true
  );

  properties.entryDoorTimer.$.i.observe(() => {
    groups.ceilingLight.$.m.$.setState.value = false;
  });
})();

export const hallway = new Element({
  devices: new Element({ ...devices, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
