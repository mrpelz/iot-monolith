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
import { deviceMap } from '../../lib/tree/elements/device.js';
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
    'lighting' as const,
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
    'lighting' as const,
    'tsiabathroom-mirrorlight.lan.wurstsalat.cloud'
  ),
  nightLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting' as const,
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
  bathtubButton: devices.bathtubButton.props.state,
  mirrorLightButton: devices.mirrorLight.props.button.props.state,
  nightLightButton: devices.nightLight.props.button.props.state,
  wallswitchDoor: devices.ceilingLight.props.button.props.state,
  wallswitchMirror: devices.wallswitchMirror.props.button0.props.state,
};

export const properties = {
  allLightsTimer: offTimer(epochs.minute * 30, true, [
    'tsiabathroom/allLightsTimer',
    persistence,
  ]),
  ceilingLight: devices.ceilingLight.props.internal.relay,
  door: new Element({
    level: Level.AREA as const,
    open: devices.doorSensor.props.internal.open,
  }),
  mirrorLed: devices.leds.props.internal.ledR,
  mirrorLight: devices.mirrorLight.props.internal.relay,
  nightLight: devices.nightLight.props.internal.relay,
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
      new SceneMember(properties.ceilingLight.props.main.props.setState, false),
      new SceneMember(properties.mirrorLed.props.brightness.props.setState, 0),
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
      new SceneMember(properties.nightLight.props.main.props.setState, false),
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
      new SceneMember(properties.mirrorLight.props.main.props.setState, false),
      new SceneMember(
        properties.nightLight.props.main.props.setState,
        true,
        false
      ),
    ],
    'light'
  ),
  nightLighting: scene(
    [
      new SceneMember(properties.ceilingLight.props.main.props.setState, false),
      new SceneMember(
        properties.mirrorLed.props.brightness.props.setState,
        0.5,
        0
      ),
      new SceneMember(properties.mirrorLight.props.main.props.setState, false),
      new SceneMember(properties.nightLight.props.main.props.setState, false),
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
  const timer = new Timer(epochs.second * 5);

  instances.bathtubButton.observe(() => {
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
    }
  });

  instances.mirrorLightButton.up(() =>
    properties.mirrorLight.props.flip.props.state.trigger()
  );
  instances.mirrorLightButton.longPress(
    () => (groups.allLights.props.main.props.setState.value = false)
  );

  instances.nightLightButton.up(() =>
    properties.nightLight.props.flip.props.state.trigger()
  );
  instances.nightLightButton.longPress(
    () => (groups.allLights.props.main.props.setState.value = false)
  );

  instances.wallswitchDoor.up(() => {
    if (groups.allLights.props.main.props.setState.value) {
      groups.allLights.props.main.props.setState.value = false;
      return;
    }

    scenes.dayLighting.props.main.props.setState.value = true;
  });
  instances.wallswitchDoor.longPress(
    () => (groups.allLights.props.main.props.setState.value = false)
  );

  instances.wallswitchMirror.up(() =>
    properties.mirrorLight.props.flip.props.state.trigger()
  );
  instances.wallswitchMirror.longPress(
    () => (groups.allLights.props.main.props.setState.value = false)
  );

  properties.door.props.open.props.main.props.state.observe((value) => {
    if (!value) return;
    if (groups.allLights.props.main.props.setState.value) return;

    scenes.autoLight.props.main.props.state.trigger();
  });

  groups.allLights.props.main.props.setState.observe((value) => {
    properties.allLightsTimer.props.active.props.state.value = value;
  }, true);

  properties.allLightsTimer.props.state.observe(() => {
    groups.allLights.props.main.props.setState.value = false;
  });
})();

export const tsiaBathroom = new Element({
  $: 'tsiaBathroom' as const,
  scenes: new Element({ ...scenes, level: Level.NONE as const }),
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
