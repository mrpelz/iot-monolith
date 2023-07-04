/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level } from '../../lib/tree/main.js';
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
  mirrorHeatingButton: devices.mirrorHeating.props.button.props.state,
  mirrorLightButton: devices.mirrorLight.props.button.props.state,
  nightLightButton: devices.nightLight.props.button.props.state,
  showerButton: devices.showerButton.props.state,
  wallswitchDoor: devices.wallswitchDoor.props.button0.props.state,
  wallswitchMirrorBottom: devices.wallswitchDoor.props.button2.props.state,
  wallswitchMirrorTop: devices.wallswitchDoor.props.button1.props.state,
};

export const properties = {
  allTimer: offTimer(epochs.minute * 30, true, [
    'mrpelzbathroom/allTimer',
    persistence,
  ]),
  ceilingLight: devices.ceilingLight.props.relay,
  door: new Element({
    level: Level.AREA as const,
    open: devices.doorSensor.props.open,
  }),
  mirrorHeating: devices.mirrorHeating.props.relay,
  mirrorLed: devices.leds.props.ledR,
  mirrorLight: devices.mirrorLight.props.relay,
  nightLight: devices.nightLight.props.relay,
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
      new SceneMember(properties.ceilingLight.props.main.props.setState, false),
      new SceneMember(
        properties.mirrorLed.props.brightness.props.setState,
        1,
        0
      ),
      new SceneMember(properties.mirrorLight.props.main.props.setState, false),
      new SceneMember(
        properties.nightLight.props.main.props.setState,
        true,
        false
      ),
    ],
    'light'
  ),
  civilTwilightLighting: scene(
    [
      new SceneMember(properties.ceilingLight.props.main.props.setState, false),
      new SceneMember(
        properties.mirrorLed.props.brightness.props.setState,
        1,
        0
      ),
      new SceneMember(
        properties.mirrorLight.props.main.props.setState,
        true,
        false
      ),
      new SceneMember(
        properties.nightLight.props.main.props.setState,
        true,
        false
      ),
    ],
    'light'
  ),
  dayLighting: scene(
    [
      new SceneMember(
        properties.ceilingLight.props.main.props.setState,
        true,
        false
      ),
      new SceneMember(
        properties.mirrorLed.props.brightness.props.setState,
        1,
        0
      ),
      new SceneMember(
        properties.mirrorLight.props.main.props.setState,
        true,
        false
      ),
      new SceneMember(properties.nightLight.props.main.props.setState, false),
    ],
    'light'
  ),
  nauticalTwilightLighting: scene(
    [
      new SceneMember(properties.ceilingLight.props.main.props.setState, false),
      new SceneMember(
        properties.mirrorLed.props.brightness.props.setState,
        1,
        0
      ),
      new SceneMember(
        properties.mirrorLight.props.main.props.setState,
        true,
        false
      ),
      new SceneMember(properties.nightLight.props.main.props.setState, false),
    ],
    'light'
  ),
  nightLighting: scene(
    [
      new SceneMember(properties.ceilingLight.props.main.props.setState, false),
      new SceneMember(properties.mirrorLed.props.main.props.setState, false),
      new SceneMember(properties.mirrorLight.props.main.props.setState, false),
      new SceneMember(
        properties.nightLight.props.main.props.setState,
        true,
        false
      ),
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
      if (devices.nightLight.props.online.props.main.props.state.value) {
        scenes.nightLighting.props.main.props.setState.value = true;

        return;
      }

      failover = true;
    }

    if (isAstronomicalTwilight(elevation) || failover) {
      if (
        devices.leds.props.online.props.main.props.state.value ||
        devices.nightLight.props.online.props.main.props.state.value
      ) {
        scenes.astronomicalTwilightLighting.props.main.props.setState.value =
          true;

        return;
      }

      failover = true;
    }

    if (isNauticalTwilight(elevation) || failover) {
      if (
        devices.leds.props.online.props.main.props.state.value ||
        devices.mirrorLight.props.online.props.main.props.state.value
      ) {
        scenes.nauticalTwilightLighting.props.main.props.setState.value = true;

        return;
      }

      failover = true;
    }

    if (isCivilTwilight(elevation) || failover) {
      if (
        devices.leds.props.online.props.main.props.state.value ||
        devices.mirrorLight.props.online.props.main.props.state.value ||
        devices.nightLight.props.online.props.main.props.state.value
      ) {
        scenes.civilTwilightLighting.props.main.props.setState.value = true;

        return;
      }
    }

    if (
      devices.ceilingLight.props.online.props.main.props.state.value ||
      devices.leds.props.online.props.main.props.state.value ||
      devices.mirrorLight.props.online.props.main.props.state.value
    ) {
      scenes.dayLighting.props.main.props.setState.value = true;

      return;
    }

    groups.allLights.props.main.props.setState.value = true;
  }, 'light'),
};

(() => {
  instances.mirrorHeatingButton.up(() =>
    properties.mirrorHeating.props.flip.props.state.trigger()
  );
  instances.mirrorHeatingButton.longPress(
    () => (groups.all.props.main.props.setState.value = false)
  );

  instances.mirrorLightButton.up(() =>
    properties.mirrorLight.props.flip.props.state.trigger()
  );
  instances.mirrorLightButton.longPress(
    () => (groups.all.props.main.props.setState.value = false)
  );

  instances.nightLightButton.up(() =>
    properties.nightLight.props.flip.props.state.trigger()
  );
  instances.nightLightButton.longPress(
    () => (groups.all.props.main.props.setState.value = false)
  );

  const timer = new Timer(epochs.second * 5);

  instances.showerButton.observe(() => {
    const firstPress = !timer.isRunning;

    timer.start();

    if (!groups.allLights.props.main.props.setState.value) {
      scenes.nightLighting.props.main.props.setState.value = true;

      return;
    }

    if (firstPress) {
      groups.allLights.props.main.props.setState.value = false;

      return;
    }

    if (
      !properties.ceilingLight.props.main.props.setState.value &&
      !properties.mirrorLed.props.main.props.setState.value &&
      !properties.mirrorLight.props.main.props.setState.value &&
      properties.nightLight.props.main.props.setState.value
    ) {
      scenes.astronomicalTwilightLighting.props.main.props.setState.value =
        true;

      return;
    }

    if (
      !properties.ceilingLight.props.main.props.setState.value &&
      !properties.mirrorLight.props.main.props.setState.value &&
      properties.mirrorLed.props.main.props.setState.value &&
      properties.nightLight.props.main.props.setState.value
    ) {
      scenes.nauticalTwilightLighting.props.main.props.setState.value = true;

      return;
    }

    if (
      !properties.ceilingLight.props.main.props.setState.value &&
      !properties.nightLight.props.main.props.setState.value &&
      properties.mirrorLed.props.main.props.setState.value &&
      properties.mirrorLight.props.main.props.setState.value
    ) {
      scenes.civilTwilightLighting.props.main.props.setState.value = true;

      return;
    }

    if (
      !properties.ceilingLight.props.main.props.setState.value &&
      properties.mirrorLed.props.main.props.setState.value &&
      properties.mirrorLight.props.main.props.setState.value &&
      properties.nightLight.props.main.props.setState.value
    ) {
      scenes.dayLighting.props.main.props.setState.value = true;

      return;
    }

    scenes.nightLighting.props.main.props.setState.value = true;
  });

  instances.wallswitchDoor.up(() => {
    if (groups.all.props.main.props.setState.value) {
      groups.all.props.main.props.setState.value = false;
      return;
    }

    scenes.dayLighting.props.main.props.setState.value = true;
  });
  instances.wallswitchDoor.longPress(
    () => (groups.all.props.main.props.setState.value = false)
  );

  instances.wallswitchMirrorTop.up(() =>
    properties.mirrorLight.props.flip.props.state.trigger()
  );
  instances.wallswitchMirrorTop.longPress(
    () => (groups.all.props.main.props.setState.value = false)
  );

  instances.wallswitchMirrorBottom.up(() => {
    if (scenes.nightLighting.props.main.props.state.value) {
      groups.all.props.main.props.setState.value = false;
      return;
    }

    scenes.nightLighting.props.main.props.setState.value = true;
  });
  instances.wallswitchMirrorBottom.longPress(
    () => (groups.all.props.main.props.setState.value = false)
  );

  properties.door.props.open.props.main.props.state.observe((value) => {
    if (!value) return;
    if (groups.allLights.props.main.props.setState.value) return;

    scenes.autoLight.props.main.props.state.trigger();
  });

  groups.all.props.main.props.setState.observe((value) => {
    properties.allTimer.props.active.props.state.value = value;
  }, true);

  properties.allTimer.props.state.observe(() => {
    groups.all.props.main.props.setState.value = false;
  });

  groups.allLights.props.main.props.setState.observe((value) => {
    properties.mirrorHeating.props.main.props.setState.value = value;
  });
})();

export const mrpelzBathroom = new Element({
  devices: new Element({ ...devices, level: Level.NONE as const }),
  scenes: new Element({ ...scenes, level: Level.NONE as const }),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
