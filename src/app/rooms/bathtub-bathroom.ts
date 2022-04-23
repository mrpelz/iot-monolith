/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import { Timer } from '../../lib/timer.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { isDay } from '../util.js';
import { logger } from '../logging.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { persistence } from '../persistence.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  bathtubButton: ev1527ButtonX1(ev1527Transport, 823914, logger),
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'bathtubbathroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    721216,
    'doorOpen'
  ),
  nightLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'bathtubbathroom-nightlight.iot.wurstsalat.cloud'
  ),
  wallswitchMirror: shellyi3(
    logger,
    timings,
    'bathtubbathroom-wallswitchmirror.iot.wurstsalat.cloud'
  ),
};

export const instances = {
  bathtubButton: devices.bathtubButton.$,
  nightLightButton: devices.nightLight.button.$,
  wallswitchDoor: devices.ceilingLight.button.$,
  wallswitchMirror: devices.wallswitchMirror.button0.$,
};

export const properties = {
  allLightsTimer: offTimer(epochs.hour, true, [
    'bathtubBathroom/allLightsTimer',
    persistence,
  ]),
  ceilingLight: devices.ceilingLight.relay,
  doorOpen: devices.doorSensor.open,
  nightLight: devices.nightLight.relay,
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.nightLight]),
};

(() => {
  const timer = new Timer(epochs.second * 5);

  instances.bathtubButton.observe(() => {
    const firstPress = !timer.isRunning;

    timer.start();

    if (firstPress) {
      if (!groups.allLights._get.value) {
        properties.nightLight._set.value = true;
        return;
      }

      groups.allLights._set.value = false;
      return;
    }

    if (
      !properties.nightLight._get.value &&
      !properties.ceilingLight._get.value
    ) {
      properties.nightLight._set.value = true;
      return;
    }

    if (
      properties.nightLight._get.value &&
      !properties.ceilingLight._get.value
    ) {
      groups.allLights._set.value = true;
      return;
    }

    if (
      properties.nightLight._get.value &&
      properties.ceilingLight._get.value
    ) {
      groups.allLights._set.value = false;
    }
  });

  instances.nightLightButton.up(() => properties.nightLight._set.flip());
  instances.nightLightButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoor.up(() => {
    if (groups.allLights._get.value) {
      groups.allLights._set.value = false;
      return;
    }

    properties.ceilingLight._set.flip();
  });
  instances.wallswitchDoor.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchMirror.up(() => properties.nightLight._set.flip());
  instances.wallswitchMirror.longPress(
    () => (groups.allLights._set.value = false)
  );

  properties.doorOpen._get.observe((value) => {
    if (!value) return;

    if (isDay()) {
      properties.ceilingLight._set.value = true;
      properties.nightLight._set.value = false;

      return;
    }

    properties.ceilingLight._set.value = false;
    properties.nightLight._set.value = true;
  });

  groups.allLights._set.observe((value) => {
    properties.allLightsTimer.active.$.value = value;
  }, true);

  properties.allLightsTimer.$.observe(() => {
    groups.allLights._set.value = false;
  });
})();

export const bathtubBathroom = {
  devices,
  ...groups,
  ...properties,
};

metadataStore.set(bathtubBathroom, {
  level: Levels.ROOM,
  name: 'bathtubBathroom',
});
