/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import {
  SceneMember,
  outputGrouping,
  scene,
  trigger,
} from '../../lib/tree/properties/actuators.js';
import {
  isAstronomicalTwilight,
  isCivilTwilight,
  isNauticalTwilight,
  isNight,
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
  bathtubButton: devices.bathtubButton.$instance,
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
};

export const scenesPartial = {
  astronomicalTwilightLighting: scene(
    [
      new SceneMember(properties.ceilingLight._set, false),
      new SceneMember(properties.mirrorLed.brightness._set, 0),
      new SceneMember(properties.mirrorLight._set, false),
      new SceneMember(properties.nightLight._set, true, false),
    ],
    'light'
  ),
  civilTwilightLighting: scene(
    [
      new SceneMember(properties.ceilingLight._set, false),
      new SceneMember(properties.mirrorLed.brightness._set, 1, 0),
      new SceneMember(properties.mirrorLight._set, true, false),
      new SceneMember(properties.nightLight._set, false),
    ],
    'light'
  ),
  dayLighting: scene(
    [
      new SceneMember(properties.ceilingLight._set, true, false),
      new SceneMember(properties.mirrorLed.brightness._set, 1, 0),
      new SceneMember(properties.mirrorLight._set, true, false),
      new SceneMember(properties.nightLight._set, false),
    ],
    'light'
  ),
  nauticalTwilightLighting: scene(
    [
      new SceneMember(properties.ceilingLight._set, false),
      new SceneMember(properties.mirrorLed.brightness._set, 1, 0),
      new SceneMember(properties.mirrorLight._set, false),
      new SceneMember(properties.nightLight._set, true, false),
    ],
    'light'
  ),
  nightLighting: scene(
    [
      new SceneMember(properties.ceilingLight._set, false),
      new SceneMember(properties.mirrorLed.brightness._set, 0.5, 0),
      new SceneMember(properties.mirrorLight._set, false),
      new SceneMember(properties.nightLight._set, false),
    ],
    'light'
  ),
};

export const scenes = {
  ...scenesPartial,
  autoLight: trigger(() => {
    let failover = false;

    const elevation = sunElevation();

    if (isNight(elevation)) {
      if (devices.nightLight.online._get.value) {
        scenes.nightLighting._set.value = true;

        return;
      }

      failover = true;
    }

    if (isAstronomicalTwilight(elevation) || failover) {
      if (
        devices.leds.online._get.value ||
        devices.nightLight.online._get.value
      ) {
        scenes.astronomicalTwilightLighting._set.value = true;

        return;
      }

      failover = true;
    }

    if (isNauticalTwilight(elevation) || failover) {
      if (
        devices.leds.online._get.value ||
        devices.mirrorLight.online._get.value
      ) {
        scenes.nauticalTwilightLighting._set.value = true;

        return;
      }

      failover = true;
    }

    if (isCivilTwilight(elevation) || failover) {
      if (
        devices.leds.online._get.value ||
        devices.mirrorLight.online._get.value ||
        devices.nightLight.online._get.value
      ) {
        scenes.civilTwilightLighting._set.value = true;

        return;
      }
    }

    if (
      devices.ceilingLight.online._get.value ||
      devices.leds.online._get.value ||
      devices.mirrorLight.online._get.value
    ) {
      scenes.dayLighting._set.value = true;

      return;
    }

    groups.allLights._set.value = true;
  }, 'light'),
};

(() => {
  const timer = new Timer(epochs.second * 5);

  instances.bathtubButton.observe(() => {
    const firstPress = !timer.isRunning;

    timer.start();

    if (!groups.allLights._set.value) {
      scenes.nightLighting._set.value = true;

      return;
    }

    if (firstPress) {
      groups.allLights._set.value = false;

      return;
    }

    if (
      !properties.ceilingLight._set.value &&
      !properties.mirrorLed._set.value &&
      !properties.mirrorLight._set.value &&
      properties.nightLight._set.value
    ) {
      scenes.astronomicalTwilightLighting._set.value = true;

      return;
    }

    if (
      !properties.ceilingLight._set.value &&
      !properties.mirrorLight._set.value &&
      properties.mirrorLed._set.value &&
      properties.nightLight._set.value
    ) {
      scenes.nauticalTwilightLighting._set.value = true;

      return;
    }

    if (
      !properties.ceilingLight._set.value &&
      !properties.nightLight._set.value &&
      properties.mirrorLed._set.value &&
      properties.mirrorLight._set.value
    ) {
      scenes.civilTwilightLighting._set.value = true;

      return;
    }

    if (
      !properties.ceilingLight._set.value &&
      properties.mirrorLed._set.value &&
      properties.mirrorLight._set.value &&
      properties.nightLight._set.value
    ) {
      scenes.dayLighting._set.value = true;
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

    scenes.dayLighting._set.value = true;
  });
  instances.wallswitchDoor.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchMirror.up(() => properties.mirrorLight._set.flip());
  instances.wallswitchMirror.longPress(
    () => (groups.allLights._set.value = false)
  );

  properties.door.open._get.observe((value) => {
    if (!value) return;
    if (groups.allLights._set.value) return;

    scenes.autoLight._set.trigger();
  });

  groups.allLights._set.observe((value) => {
    properties.allLightsTimer.active.$.value = value;
  }, true);

  properties.allLightsTimer.$instance.observe(() => {
    groups.allLights._set.value = false;
  });
})();

export const tsiaBathroom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
    ...scenes,
  },
  {
    level: Levels.ROOM,
    name: 'tsiaBathroom',
  }
);
