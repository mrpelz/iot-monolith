/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import {
  isAstronomicalTwilight,
  isCivilTwilight,
  isDay,
  isNauticalTwilight,
  sunElevation,
} from '../util.js';
import { Timer } from '../../lib/timer.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../lib/tree/devices/h801.js';
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
    'tsiabathroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 721216),
  leds: h801(
    logger,
    persistence,
    timings,
    'tsiabathroom-leds.lan.wurstsalat.cloud'
  ),
  mirrorLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'tsiabathroom-mirrorlight.lan.wurstsalat.cloud'
  ),
  nightLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'tsiabathroom-nightlight.lan.wurstsalat.cloud'
  ),
  wallswitchMirror: shellyi3(
    logger,
    persistence,
    timings,
    'tsiabathroom-wallswitchmirror.lan.wurstsalat.cloud'
  ),
};

export const instances = {
  bathtubButton: devices.bathtubButton.$,
  mirrorLightButton: devices.mirrorLight.button.$,
  nightLightButton: devices.nightLight.button.$,
  wallswitchDoor: devices.ceilingLight.button.$,
  wallswitchMirror: devices.wallswitchMirror.button0.$,
};

export const properties = {
  allLightsTimer: offTimer(epochs.minute * 30, true, [
    'tsiabathroom/allLightsTimer',
    persistence,
  ]),
  ceilingLight: devices.ceilingLight.relay,
  door: addMeta({ open: devices.doorSensor.open }, { level: Levels.AREA }),
  mirrorLed: devices.leds.ledR,
  mirrorLight: devices.mirrorLight.relay,
  nightLight: devices.nightLight.relay,
};

export const groups = {
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
  const timer = new Timer(epochs.second * 5);

  instances.bathtubButton.observe(() => {
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
      properties.mirrorLight._get.value &&
      properties.nightLight._get.value
    ) {
      groups.allLights._set.value = false;
      return;
    }

    if (!groups.allLights._set.value) {
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

  instances.mirrorLightButton.up(() => properties.mirrorLight._set.flip());
  instances.mirrorLightButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.nightLightButton.up(() => properties.nightLight._set.flip());
  instances.nightLightButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoor.up(() => {
    if (groups.allLights._set.value) {
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

  properties.door.open._get.observe((value) => {
    if (!value) return;

    const elevation = sunElevation();

    if (
      isDay(elevation) &&
      (devices.ceilingLight.online._get.value ||
        devices.mirrorLight.online._get.value)
    ) {
      groups.ceilingLights._set.value = true;
      groups.nightLights._set.value = false;

      return;
    }

    if (isCivilTwilight(elevation) && devices.mirrorLight.online._get.value) {
      properties.ceilingLight._set.value = false;
      properties.mirrorLight._set.value = true;
      groups.nightLights._set.value = false;

      return;
    }

    if (isNauticalTwilight(elevation) && devices.nightLight.online._get.value) {
      groups.ceilingLights._set.value = false;
      properties.nightLight._set.value = true;
      properties.mirrorLed._set.value = false;

      return;
    }

    if (devices.leds.online._get.value) {
      if (isAstronomicalTwilight(elevation)) {
        groups.ceilingLights._set.value = false;
        properties.nightLight._set.value = false;
        properties.mirrorLed.brightness._set.value = 1;

        return;
      }

      groups.ceilingLights._set.value = false;
      properties.nightLight._set.value = false;
      properties.mirrorLed.brightness._set.value = 0.1;

      return;
    }

    groups.allLights._set.value = true;
  });

  groups.allLights._set.observe((value) => {
    properties.allLightsTimer.active.$.value = value;
  }, true);

  properties.allLightsTimer.$.observe(() => {
    groups.allLights._set.value = false;
  });
})();

export const tsiaBathroom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    level: Levels.ROOM,
    name: 'tsiaBathroom',
  }
);
