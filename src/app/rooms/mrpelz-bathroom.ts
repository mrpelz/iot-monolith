/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import { Timer } from '../../lib/timer.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../lib/tree/devices/h801.js';
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
    'mrpelzbathroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 720256),
  leds: h801(
    logger,
    persistence,
    timings,
    'mrpelzbathroom-leds.lan.wurstsalat.cloud',
    undefined,
    false
  ),
  mirrorHeating: sonoffBasic(
    logger,
    persistence,
    timings,
    'heating',
    'mrpelzbathroom-mirrorheating.lan.wurstsalat.cloud',
    undefined,
    false
  ),
  mirrorLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'mrpelzbathroom-mirrorlight.lan.wurstsalat.cloud'
  ),
  nightLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'mrpelzbathroom-nightlight.lan.wurstsalat.cloud'
  ),
  showerButton: ev1527ButtonX1(ev1527Transport, 628217, logger),
  wallswitchDoor: shellyi3(
    logger,
    persistence,
    timings,
    'mrpelzbathroom-wallswitchdoor.lan.wurstsalat.cloud'
  ),
};

export const instances = {
  mirrorHeatingButton: devices.mirrorHeating.button.$,
  mirrorLightButton: devices.mirrorLight.button.$,
  nightLightButton: devices.nightLight.button.$,
  showerButton: devices.showerButton.$,
  wallswitchDoor: devices.wallswitchDoor.button0.$,
  wallswitchMirrorBottom: devices.wallswitchDoor.button2.$,
  wallswitchMirrorTop: devices.wallswitchDoor.button1.$,
};

export const properties = {
  allTimer: offTimer(epochs.minute * 30, true, [
    'mrpelzbathroom/allTimer',
    persistence,
  ]),
  ceilingLight: devices.ceilingLight.relay,
  door: addMeta({ open: devices.doorSensor.open }, { level: Levels.AREA }),
  mirrorHeating: devices.mirrorHeating.relay,
  mirrorLed: devices.leds.ledR,
  mirrorLight: devices.mirrorLight.relay,
  nightLight: devices.nightLight.relay,
};

export const groups = {
  all: outputGrouping([
    properties.ceilingLight,
    properties.mirrorHeating,
    properties.mirrorLed,
    properties.mirrorLight,
    properties.nightLight,
  ]),
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.mirrorLed,
    properties.mirrorLight,
    properties.nightLight,
  ]),
  ceilingLights: outputGrouping([
    properties.ceilingLight,
    properties.mirrorLight,
  ]),
  nightLights: outputGrouping([properties.mirrorLed, properties.nightLight]),
};

(() => {
  instances.mirrorHeatingButton.up(() => properties.mirrorHeating._set.flip());
  instances.mirrorHeatingButton.longPress(
    () => (groups.all._set.value = false)
  );

  instances.mirrorLightButton.up(() => properties.mirrorLight._set.flip());
  instances.mirrorLightButton.longPress(() => (groups.all._set.value = false));

  instances.nightLightButton.up(() => properties.nightLight._set.flip());
  instances.nightLightButton.longPress(() => (groups.all._set.value = false));

  const timer = new Timer(epochs.second * 5);

  instances.showerButton.observe(() => {
    const firstPress = !timer.isRunning;

    timer.start();

    if (firstPress) {
      if (!groups.allLights._set.value) {
        properties.nightLight._set.value = true;
        return;
      }

      groups.allLights._set.value = false;
      return;
    }

    if (
      properties.ceilingLight._get.value &&
      properties.mirrorLed._get.value &&
      properties.mirrorLight._get.value &&
      properties.nightLight._get.value
    ) {
      groups.allLights._set.value = false;
      return;
    }

    if (!groups.allLights._set.value) {
      properties.mirrorLed._set.value = true;
      return;
    }

    if (properties.mirrorLed._get.value) {
      properties.mirrorLed._set.value = false;
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
    if (groups.allLights._set.value) {
      groups.allLights._set.value = false;
      return;
    }

    properties.ceilingLight._set.flip();
  });
  instances.wallswitchDoor.longPress(() => (groups.all._set.value = false));

  instances.wallswitchMirrorTop.up(() => properties.mirrorLight._set.flip());
  instances.wallswitchMirrorTop.longPress(
    () => (groups.all._set.value = false)
  );

  instances.wallswitchMirrorBottom.up(() => groups.nightLights._set.flip());
  instances.wallswitchMirrorBottom.longPress(
    () => (groups.all._set.value = false)
  );

  properties.door.open._get.observe((value) => {
    if (!value) return;

    if (isDay()) {
      groups.ceilingLights._set.value = true;
      groups.nightLights._set.value = false;

      return;
    }

    groups.ceilingLights._set.value = false;
    groups.nightLights._set.value = true;
  });

  groups.all._set.observe((value) => {
    properties.allTimer.active.$.value = value;
  }, true);

  properties.allTimer.$.observe(() => {
    groups.all._set.value = false;
  });
})();

export const mrpelzBathroom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    level: Levels.ROOM,
    name: 'mrpelzBathroom',
  }
);
