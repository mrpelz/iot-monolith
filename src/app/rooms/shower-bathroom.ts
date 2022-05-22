/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
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
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'showerbathroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 720256),
  mirrorLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'showerbathroom-mirrorlight.lan.wurstsalat.cloud'
  ),
  nightLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'showerbathroom-nightlight.lan.wurstsalat.cloud'
  ),
  showerButton: ev1527ButtonX1(ev1527Transport, 628217, logger),
  wallswitchDoor: shellyi3(
    logger,
    timings,
    'showerbathroom-wallswitchdoor.lan.wurstsalat.cloud'
  ),
};

export const instances = {
  mirrorLightButton: devices.mirrorLight.button.$,
  nightLightButton: devices.nightLight.button.$,
  showerButton: devices.showerButton.$,
  wallswitchDoor: devices.wallswitchDoor.button0.$,
  wallswitchMirrorBottom: devices.wallswitchDoor.button2.$,
  wallswitchMirrorTop: devices.wallswitchDoor.button1.$,
};

export const properties = {
  allLightsTimer: offTimer(epochs.minute * 30, true, [
    'showerBathroom/allLightsTimer',
    persistence,
  ]),
  ceilingLight: devices.ceilingLight.relay,
  door: addMeta({ open: devices.doorSensor.open }, { level: Levels.AREA }),
  mirrorLight: devices.mirrorLight.relay,
  nightLight: devices.nightLight.relay,
};

export const groups = {
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.mirrorLight,
    properties.nightLight,
  ]),
};

(() => {
  instances.mirrorLightButton.up(() => properties.mirrorLight._set.flip());
  instances.mirrorLightButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.nightLightButton.up(() => properties.nightLight._set.flip());
  instances.nightLightButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  const timer = new Timer(epochs.second * 5);

  instances.showerButton.observe(() => {
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
      properties.ceilingLight._get.value &&
      properties.mirrorLight._get.value &&
      properties.nightLight._get.value
    ) {
      groups.allLights._set.value = false;
      return;
    }

    if (!groups.allLights._get.value) {
      properties.nightLight._set.value = true;
      return;
    }

    if (properties.nightLight._get.value) {
      properties.nightLight._set.value = false;
      properties.mirrorLight._set.value = true;
      return;
    }

    if (properties.mirrorLight._get.value) {
      properties.mirrorLight._set.value = false;
      properties.ceilingLight._set.value = true;
      return;
    }

    if (properties.ceilingLight._get.value) {
      groups.allLights._set.value = true;
    }
  });

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

  instances.wallswitchMirrorTop.up(() => properties.mirrorLight._set.flip());
  instances.wallswitchMirrorTop.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchMirrorBottom.up(() => properties.nightLight._set.flip());
  instances.wallswitchMirrorBottom.longPress(
    () => (groups.allLights._set.value = false)
  );

  properties.door.open._get.observe((value) => {
    if (!value) return;

    if (isDay()) {
      properties.ceilingLight._set.value = true;
      properties.mirrorLight._set.value = false;
      properties.nightLight._set.value = false;

      return;
    }

    properties.ceilingLight._set.value = false;
    properties.mirrorLight._set.value = false;
    properties.nightLight._set.value = true;
  });

  groups.allLights._set.observe((value) => {
    properties.allLightsTimer.active.$.value = value;
  }, true);

  properties.allLightsTimer.$.observe(() => {
    groups.allLights._set.value = false;
  });
})();

export const showerBathroom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    level: Levels.ROOM,
    name: 'showerBathroom',
  }
);
