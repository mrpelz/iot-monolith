import { epochs } from '../../../lib/epochs.js';
import { Timer } from '../../../lib/timer.js';
import { ev1527ButtonX1 } from '../../../lib/tree/devices/ev1527-button.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import {
  outputGrouping,
  scene,
  SceneMember,
  triggerElement,
} from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { door } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import {
  isAstronomicalTwilight,
  isCivilTwilight,
  isNauticalTwilight,
  isNight,
  sunElevation,
} from '../../util.js';
import { ev1527Transport } from '../bridges.js';

export const devices = {
  bathtubButton: ev1527ButtonX1(823_914, ev1527Transport, context),
  ceilingLight: shelly1(
    'lighting' as const,
    'tsiabathroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  doorSensor: ev1527WindowSensor(721_216, ev1527Transport, context),
  leds: h801('tsiabathroom-leds.lan.wurstsalat.cloud', context),
  mirrorLight: sonoffBasic(
    'lighting' as const,
    'tsiabathroom-mirrorlight.lan.wurstsalat.cloud',
    context,
  ),
  nightLight: sonoffBasic(
    'lighting' as const,
    'tsiabathroom-nightlight.lan.wurstsalat.cloud',
    context,
  ),
  wallswitchMirror: shellyi3(
    'tsiabathroom-wallswitchmirror.lan.wurstsalat.cloud',
    context,
  ),
};

export const instances = {
  bathtubButton: devices.bathtubButton.state,
  mirrorLightButton: devices.mirrorLight.internal.button.state,
  nightLightButton: devices.nightLight.internal.button.state,
  wallswitchDoor: devices.ceilingLight.internal.button.state,
  wallswitchMirror: devices.wallswitchMirror.internal.button0.state,
};

export const properties = {
  allLightsTimer: offTimer(context, epochs.minute * 30, true),
  ceilingLight: devices.ceilingLight.internal.relay,
  door: door(context, devices.doorSensor, undefined),
  mirrorLed: devices.leds.internal.ledR,
  mirrorLight: devices.mirrorLight.internal.relay,
  nightLight: devices.nightLight.internal.relay,
};

export const groups = {
  allLights: outputGrouping(
    context,
    [
      properties.ceilingLight,
      properties.mirrorLed,
      properties.mirrorLight,
      properties.nightLight,
    ],
    'lighting',
  ),
};

export const scenesPartial = {
  astronomicalTwilightLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 0),
      new SceneMember(properties.mirrorLight.main.setState, false),
      new SceneMember(properties.nightLight.main.setState, true, false),
    ],
    'light',
  ),
  civilTwilightLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, true, false),
      new SceneMember(properties.nightLight.main.setState, false),
    ],
    'light',
  ),
  dayLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, true, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, true, false),
      new SceneMember(properties.nightLight.main.setState, false),
    ],
    'light',
  ),
  nauticalTwilightLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, false),
      new SceneMember(properties.nightLight.main.setState, true, false),
    ],
    'light',
  ),
  nightLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 0.5, 0),
      new SceneMember(properties.mirrorLight.main.setState, false),
      new SceneMember(properties.nightLight.main.setState, false),
    ],
    'light',
  ),
};

export const scenes = {
  autoLight: triggerElement(context, 'light', () => {
    let failover = false;

    const elevation = sunElevation();

    if (isNight(elevation)) {
      if (devices.nightLight.online.main.state.value) {
        scenes.nightLighting.main.setState.value = true;

        return;
      }

      failover = true;
    }

    if (isAstronomicalTwilight(elevation) || failover) {
      if (
        devices.leds.online.main.state.value ||
        devices.nightLight.online.main.state.value
      ) {
        scenes.astronomicalTwilightLighting.main.setState.value = true;

        return;
      }

      failover = true;
    }

    if (isNauticalTwilight(elevation) || failover) {
      if (
        devices.leds.online.main.state.value ||
        devices.mirrorLight.online.main.state.value
      ) {
        scenes.nauticalTwilightLighting.main.setState.value = true;

        return;
      }

      failover = true;
    }

    if (
      (isCivilTwilight(elevation) || failover) &&
      (devices.leds.online.main.state.value ||
        devices.mirrorLight.online.main.state.value ||
        devices.nightLight.online.main.state.value)
    ) {
      scenes.civilTwilightLighting.main.setState.value = true;

      return;
    }

    if (
      devices.ceilingLight.online.main.state.value ||
      devices.leds.online.main.state.value ||
      devices.mirrorLight.online.main.state.value
    ) {
      scenes.dayLighting.main.setState.value = true;

      return;
    }

    groups.allLights.main.setState.value = true;
  }),
  ...scenesPartial,
};

(() => {
  const timer = new Timer(epochs.second * 5);

  instances.bathtubButton.observe(() => {
    const firstPress = !timer.isActive.value;

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
    }
  });

  instances.mirrorLightButton.up(() =>
    properties.mirrorLight.flip.setState.trigger(),
  );
  instances.mirrorLightButton.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.nightLightButton.up(() =>
    properties.nightLight.flip.setState.trigger(),
  );
  instances.nightLightButton.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchDoor.up(() => {
    if (groups.allLights.main.setState.value) {
      groups.allLights.main.setState.value = false;
      return;
    }

    scenes.dayLighting.main.setState.value = true;
  });
  instances.wallswitchDoor.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchMirror.up(() =>
    properties.mirrorLight.flip.setState.trigger(),
  );
  instances.wallswitchMirror.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  properties.door.open.main.state.observe((value) => {
    if (!value) return;
    if (groups.allLights.main.setState.value) return;

    scenes.autoLight.main.setState.trigger();
  });

  groups.allLights.main.setState.observe((value) => {
    properties.allLightsTimer.state[value ? 'start' : 'stop']();
  }, true);

  properties.allLightsTimer.state.observe(() => {
    groups.allLights.main.setState.value = false;
  });
})();

export const tsiaBathroom = {
  $: 'tsiaBathroom' as const,
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  ...scenes,
};
