/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../../lib/tree/main.js';
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
  mirrorHeatingButton: devices.mirrorHeating.button.instance,
  mirrorLightButton: devices.mirrorLight.button.instance,
  nightLightButton: devices.nightLight.button.instance,
  showerButton: devices.showerButton.instance,
  wallswitchDoor: devices.wallswitchDoor.button0.instance,
  wallswitchMirrorBottom: devices.wallswitchDoor.button2.instance,
  wallswitchMirrorTop: devices.wallswitchDoor.button1.instance,
};

export const properties = {
  allTimer: offTimer(epochs.minute * 30, true, [
    'mrpelzbathroom/allTimer',
    persistence,
  ]),
  ceilingLight: devices.ceilingLight.relay,
  door: element({
    open: devices.doorSensor.open,
    [symbolLevel]: Level.AREA,
  }),
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
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, false),
      new SceneMember(properties.nightLight.main.setState, true, false),
    ],
    'light'
  ),
  civilTwilightLighting: scene(
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, true, false),
      new SceneMember(properties.nightLight.main.setState, true, false),
    ],
    'light'
  ),
  dayLighting: scene(
    [
      new SceneMember(properties.ceilingLight.main.setState, true, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, true, false),
      new SceneMember(properties.nightLight.main.setState, false),
    ],
    'light'
  ),
  nauticalTwilightLighting: scene(
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, true, false),
      new SceneMember(properties.nightLight.main.setState, false),
    ],
    'light'
  ),
  nightLighting: scene(
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.main.setState, false),
      new SceneMember(properties.mirrorLight.main.setState, false),
      new SceneMember(properties.nightLight.main.setState, true, false),
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
      if (devices.nightLight.online.main.instance.value) {
        scenes.nightLighting.main.setState.value = true;

        return;
      }

      failover = true;
    }

    if (isAstronomicalTwilight(elevation) || failover) {
      if (
        devices.leds.online.main.instance.value ||
        devices.nightLight.online.main.instance.value
      ) {
        scenes.astronomicalTwilightLighting.main.setState.value = true;

        return;
      }

      failover = true;
    }

    if (isNauticalTwilight(elevation) || failover) {
      if (
        devices.leds.online.main.instance.value ||
        devices.mirrorLight.online.main.instance.value
      ) {
        scenes.nauticalTwilightLighting.main.setState.value = true;

        return;
      }

      failover = true;
    }

    if (isCivilTwilight(elevation) || failover) {
      if (
        devices.leds.online.main.instance.value ||
        devices.mirrorLight.online.main.instance.value ||
        devices.nightLight.online.main.instance.value
      ) {
        scenes.civilTwilightLighting.main.setState.value = true;

        return;
      }
    }

    if (
      devices.ceilingLight.online.main.instance.value ||
      devices.leds.online.main.instance.value ||
      devices.mirrorLight.online.main.instance.value
    ) {
      scenes.dayLighting.main.setState.value = true;

      return;
    }

    groups.allLights.main.setState.value = true;
  }, 'light'),
};

(() => {
  instances.mirrorHeatingButton.up(() =>
    properties.mirrorHeating.flip.instance.trigger()
  );
  instances.mirrorHeatingButton.longPress(
    () => (groups.all.main.setState.value = false)
  );

  instances.mirrorLightButton.up(() =>
    properties.mirrorLight.flip.instance.trigger()
  );
  instances.mirrorLightButton.longPress(
    () => (groups.all.main.setState.value = false)
  );

  instances.nightLightButton.up(() =>
    properties.nightLight.flip.instance.trigger()
  );
  instances.nightLightButton.longPress(
    () => (groups.all.main.setState.value = false)
  );

  const timer = new Timer(epochs.second * 5);

  instances.showerButton.observe(() => {
    const firstPress = !timer.isRunning;

    timer.start();

    if (!groups.allLights.main.setState.value) {
      scenes.nightLighting.main.setState.value = true;

      return;
    }

    if (firstPress) {
      groups.allLights.main.setState.value = false;

      return;
    }

    if (
      !properties.ceilingLight.main.setState.value &&
      !properties.mirrorLed.main.setState.value &&
      !properties.mirrorLight.main.setState.value &&
      properties.nightLight.main.setState.value
    ) {
      scenes.astronomicalTwilightLighting.main.setState.value = true;

      return;
    }

    if (
      !properties.ceilingLight.main.setState.value &&
      !properties.mirrorLight.main.setState.value &&
      properties.mirrorLed.main.setState.value &&
      properties.nightLight.main.setState.value
    ) {
      scenes.nauticalTwilightLighting.main.setState.value = true;

      return;
    }

    if (
      !properties.ceilingLight.main.setState.value &&
      !properties.nightLight.main.setState.value &&
      properties.mirrorLed.main.setState.value &&
      properties.mirrorLight.main.setState.value
    ) {
      scenes.civilTwilightLighting.main.setState.value = true;

      return;
    }

    if (
      !properties.ceilingLight.main.setState.value &&
      properties.mirrorLed.main.setState.value &&
      properties.mirrorLight.main.setState.value &&
      properties.nightLight.main.setState.value
    ) {
      scenes.dayLighting.main.setState.value = true;

      return;
    }

    scenes.nightLighting.main.setState.value = true;
  });

  instances.wallswitchDoor.up(() => {
    if (groups.all.main.setState.value) {
      groups.all.main.setState.value = false;
      return;
    }

    scenes.dayLighting.main.setState.value = true;
  });
  instances.wallswitchDoor.longPress(
    () => (groups.all.main.setState.value = false)
  );

  instances.wallswitchMirrorTop.up(() =>
    properties.mirrorLight.flip.instance.trigger()
  );
  instances.wallswitchMirrorTop.longPress(
    () => (groups.all.main.setState.value = false)
  );

  instances.wallswitchMirrorBottom.up(() => {
    if (scenes.nightLighting.main.instance.value) {
      groups.all.main.setState.value = false;
      return;
    }

    scenes.nightLighting.main.setState.value = true;
  });
  instances.wallswitchMirrorBottom.longPress(
    () => (groups.all.main.setState.value = false)
  );

  properties.door.open.main.instance.observe((value) => {
    if (!value) return;
    if (groups.allLights.main.setState.value) return;

    scenes.autoLight.main.instance.trigger();
  });

  groups.all.main.setState.observe((value) => {
    properties.allTimer.active.instance.value = value;
  }, true);

  properties.allTimer.instance.observe(() => {
    groups.all.main.setState.value = false;
  });

  groups.allLights.main.setState.observe((value) => {
    properties.mirrorHeating.main.setState.value = value;
  });
})();

export const mrpelzBathroom = element({
  devices: element({ ...devices, [symbolLevel]: Level.NONE }),
  scenes: element({ ...scenes, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
