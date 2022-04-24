/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
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
    'hallway-ceilinglightback.iot.wurstsalat.cloud'
  ),
  ceilingLightFront: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'hallway-ceilinglightfront.iot.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    55024,
    'doorOpen'
  ),
  wallswitchBack: shellyi3(
    logger,
    timings,
    'hallway-wallswitchback.iot.wurstsalat.cloud'
  ),
  wallswitchFront: shellyi3(
    logger,
    timings,
    'hallway-wallswitchfront.iot.wurstsalat.cloud'
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
  door: devices.doorSensor.open,
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
  const { allLights } = await import('../groups.js');

  instances.wallswitchBack.up(() => groups.ceilingLight._set.flip());

  instances.wallswitchMiddle.up(() => groups.ceilingLight._set.flip());

  instances.wallswitchFrontLeft.up(() =>
    properties.ceilingLightFront._set.flip()
  );
  instances.wallswitchFrontMiddle.up(() =>
    properties.ceilingLightBack._set.flip()
  );
  instances.wallswitchFrontRight.up(() => allLights._set.flip());

  properties.door._get.observe((value) => {
    if (!value) {
      if (!groups.ceilingLight._get.value) return;

      properties.entryDoorTimer.active.$.value = true;

      return;
    }

    properties.ceilingLightFront._set.value = true;
  });

  groups.ceilingLight._get.observe(
    () => (properties.entryDoorTimer.active.$.value = false),
    true
  );

  properties.entryDoorTimer.$.observe(() => {
    groups.ceilingLight._set.value = false;
  });
})();

export const hallway = {
  devices,
  ...groups,
  ...properties,
};

metadataStore.set(hallway, {
  isConnectingRoom: true,
  level: Levels.ROOM,
  name: 'hallway',
});
