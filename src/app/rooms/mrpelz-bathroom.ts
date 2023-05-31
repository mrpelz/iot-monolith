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
    'mrpelzbathroom-leds.lan.wurstsalat.cloud'
  ),
  mirrorHeating: sonoffBasic(
    logger,
    persistence,
    timings,
    'heating',
    'mrpelzbathroom-mirrorheating.lan.wurstsalat.cloud'
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
  showerButton: devices.showerButton.$instance,
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
  all: outputGrouping(
    [
      properties.ceilingLight,
      properties.mirrorHeating,
      properties.mirrorLed,
      properties.mirrorLight,
      properties.nightLight,
    ],
    'group'
  ),
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.mirrorLed,
    properties.mirrorLight,
    properties.nightLight,
  ]),
};

const scenesPartial = {
  astronomicalTwilightLighting: scene(
    [
      new SceneMember(properties.ceilingLight._set, false),
      new SceneMember(properties.mirrorLed.brightness._set, 1, 0),
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
      new SceneMember(properties.nightLight._set, true, false),
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
      new SceneMember(properties.mirrorLight._set, true, false),
      new SceneMember(properties.nightLight._set, false),
    ],
    'light'
  ),
  nightLighting: scene(
    [
      new SceneMember(properties.ceilingLight._set, false),
      new SceneMember(properties.mirrorLed._set, false),
      new SceneMember(properties.mirrorLight._set, false),
      new SceneMember(properties.nightLight._set, true, false),
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

      return;
    }

    scenes.nightLighting._set.value = true;
  });

  instances.wallswitchDoor.up(() => {
    if (groups.all._set.value) {
      groups.all._set.value = false;
      return;
    }

    scenes.dayLighting._set.value = true;
  });
  instances.wallswitchDoor.longPress(() => (groups.all._set.value = false));

  instances.wallswitchMirrorTop.up(() => properties.mirrorLight._set.flip());
  instances.wallswitchMirrorTop.longPress(
    () => (groups.all._set.value = false)
  );

  instances.wallswitchMirrorBottom.up(() => {
    if (scenes.nightLighting._get.value) {
      groups.all._set.value = false;
      return;
    }

    scenes.nightLighting._set.value = true;
  });
  instances.wallswitchMirrorBottom.longPress(
    () => (groups.all._set.value = false)
  );

  properties.door.open._get.observe((value) => {
    if (!value) return;
    if (groups.allLights._set.value) return;

    scenes.autoLight._set.trigger();
  });

  groups.all._set.observe((value) => {
    properties.allTimer.active.$.value = value;
  }, true);

  properties.allTimer.$instance.observe(() => {
    groups.all._set.value = false;
  });

  groups.allLights._set.observe((value) => {
    properties.mirrorHeating._set.value = value;
  });
})();

export const mrpelzBathroom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
    ...scenes,
  },
  {
    level: Levels.ROOM,
    name: 'mrpelzBathroom',
  }
);
