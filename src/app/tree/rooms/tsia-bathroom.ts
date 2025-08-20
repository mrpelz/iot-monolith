import { epochs } from '@mrpelz/modifiable-date';

import { makeCustomStringLogger } from '../../../lib/log.js';
import { ev1527ButtonX1 } from '../../../lib/tree/devices/ev1527-button.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import {
  flipMain,
  getMain,
  setMain,
  triggerMain,
} from '../../../lib/tree/logic.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import {
  outputGrouping,
  scene,
  SceneMember,
  triggerElement,
} from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { door } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
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
  bathtubButton: devices.bathtubButton,
  mirrorLightButton: devices.mirrorLight.button,
  nightLightButton: devices.nightLight.button,
  wallswitchDoor: devices.ceilingLight.button,
  wallswitchMirror: devices.wallswitchMirror.button0,
};

export const properties = {
  allLightsTimer: offTimer(context, epochs.minute * 30, true),
  ceilingLight: devices.ceilingLight.relay,
  door: door(context, devices.doorSensor, undefined),
  mirrorLed: devices.leds.ledR,
  mirrorLight: devices.mirrorLight.relay,
  nightLight: devices.nightLight.relay,
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
      if (devices.nightLight.device.online.main.state.value) {
        scenes.nightLighting.main.setState.value = true;

        return;
      }

      failover = true;
    }

    if (isAstronomicalTwilight(elevation) || failover) {
      if (
        devices.leds.device.online.main.state.value ||
        devices.nightLight.device.online.main.state.value
      ) {
        scenes.astronomicalTwilightLighting.main.setState.value = true;

        return;
      }

      failover = true;
    }

    if (isNauticalTwilight(elevation) || failover) {
      if (
        devices.leds.device.online.main.state.value ||
        devices.mirrorLight.device.online.main.state.value
      ) {
        scenes.nauticalTwilightLighting.main.setState.value = true;

        return;
      }

      failover = true;
    }

    if (
      (isCivilTwilight(elevation) || failover) &&
      (devices.leds.device.online.main.state.value ||
        devices.mirrorLight.device.online.main.state.value ||
        devices.nightLight.device.online.main.state.value)
    ) {
      scenes.civilTwilightLighting.main.setState.value = true;

      return;
    }

    if (
      devices.ceilingLight.device.online.main.state.value ||
      devices.leds.device.online.main.state.value ||
      devices.mirrorLight.device.online.main.state.value
    ) {
      scenes.dayLighting.main.setState.value = true;

      return;
    }

    groups.allLights.main.setState.value = true;
  }),
  ...scenesPartial,
};

const $init: InitFunction = (room, introspection) => {
  const {
    bathtubButton,
    mirrorLightButton,
    nightLightButton,
    wallswitchDoor,
    wallswitchMirror,
  } = instances;
  const { allLights } = groups;
  const { allLightsTimer, door: door_, mirrorLight, nightLight } = properties;
  const {
    astronomicalTwilightLighting,
    autoLight,
    civilTwilightLighting,
    dayLighting,
    nauticalTwilightLighting,
    nightLighting,
  } = scenes;

  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

  bathtubButton.state.observe(() => {
    if (getMain(allLights)) {
      setMain(allLights, false, () =>
        l(
          `${p(bathtubButton)} turned off ${p(allLights)} because ${p(allLights)} was on`,
        ),
      );

      return;
    }

    triggerMain(autoLight, () =>
      l(
        `${p(bathtubButton)} triggered ${p(autoLight)} because ${p(allLights)} was off`,
      ),
    );
  });

  mirrorLightButton.state.up(() =>
    flipMain(mirrorLight, () =>
      l(
        `${p(mirrorLightButton)} ${mirrorLightButton.state.up.name} flipped ${p(mirrorLight)}`,
      ),
    ),
  );

  mirrorLightButton.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(mirrorLightButton)} ${mirrorLightButton.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  nightLightButton.state.up(() =>
    flipMain(nightLight, () =>
      l(
        `${p(nightLightButton)} ${nightLightButton.state.up.name} flipped ${p(nightLight)}`,
      ),
    ),
  );

  nightLightButton.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(nightLightButton)} ${nightLightButton.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  wallswitchDoor.state.up(() => {
    if (getMain(allLights)) {
      setMain(allLights, false, () =>
        l(
          `${p(wallswitchDoor)} ${wallswitchDoor.state.up.name} turned off ${p(allLights)} because ${p(allLights)} was on`,
        ),
      );

      return;
    }

    triggerMain(autoLight, () =>
      l(
        `${p(wallswitchDoor)} ${wallswitchDoor.state.up.name} triggered ${p(autoLight)} because ${p(allLights)} was off`,
      ),
    );
  });

  wallswitchDoor.state.longPress(() =>
    flipMain(allLights, () =>
      l(
        `${p(wallswitchDoor)} ${wallswitchDoor.state.longPress.name} flipped ${p(allLights)}`,
      ),
    ),
  );

  wallswitchMirror.state.up(() =>
    flipMain(mirrorLight, () =>
      l(
        `${p(wallswitchMirror)} ${wallswitchMirror.state.up.name} flipped ${p(mirrorLight)}`,
      ),
    ),
  );

  wallswitchMirror.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(wallswitchMirror)} ${wallswitchMirror.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  door_.open.main.state.observe((open) => {
    if (!open) return;
    if (getMain(allLights)) return;

    triggerMain(autoLight, () =>
      l(`${p(door_)} was opened and ${p(autoLight)} was triggered`),
    );
  });

  allLights.main.setState.observe((value, _observer, changed) => {
    if (changed) {
      l(
        `${p(allLightsTimer)} was ${value ? 'started' : 'stopped'} because ${p(allLights)} was turned ${value ? 'on' : 'off'}`,
      );
    }

    allLightsTimer.state[value ? 'start' : 'stop']();
  }, true);

  allLightsTimer.state.observe(() =>
    setMain(allLights, false, () =>
      l(`${p(allLights)} was turned off because ${p(allLightsTimer)} ran out`),
    ),
  );

  autoLight.state.observe(() => {
    let failover = false;

    const elevation = sunElevation();

    if (isNight(elevation)) {
      if (devices.nightLight.device.online.main.state.value) {
        setMain(nightLighting, true, () =>
          l(
            `${p(nightLighting)} was turned on because sun elevation is ${elevation}`,
          ),
        );

        return;
      }

      failover = true;
    }

    if (isAstronomicalTwilight(elevation) || failover) {
      if (
        devices.leds.device.online.main.state.value ||
        devices.nightLight.device.online.main.state.value
      ) {
        setMain(astronomicalTwilightLighting, true, () =>
          l(
            `${p(astronomicalTwilightLighting)} was turned on because sun elevation is ${elevation}`,
          ),
        );

        return;
      }

      failover = true;
    }

    if (isNauticalTwilight(elevation) || failover) {
      if (
        devices.leds.device.online.main.state.value ||
        devices.mirrorLight.device.online.main.state.value
      ) {
        setMain(nauticalTwilightLighting, true, () =>
          l(
            `${p(nauticalTwilightLighting)} was turned on because sun elevation is ${elevation}`,
          ),
        );

        return;
      }

      failover = true;
    }

    if (
      (isCivilTwilight(elevation) || failover) &&
      (devices.leds.device.online.main.state.value ||
        devices.mirrorLight.device.online.main.state.value ||
        devices.nightLight.device.online.main.state.value)
    ) {
      setMain(civilTwilightLighting, true, () =>
        l(
          `${p(civilTwilightLighting)} was turned on because sun elevation is ${elevation}`,
        ),
      );

      return;
    }

    if (
      devices.ceilingLight.device.online.main.state.value ||
      devices.leds.device.online.main.state.value ||
      devices.mirrorLight.device.online.main.state.value
    ) {
      setMain(dayLighting, true, () =>
        l(
          `${p(dayLighting)} was turned on because sun elevation is ${elevation}`,
        ),
      );

      return;
    }

    setMain(allLights, true, () =>
      l(`${p(allLights)} was turned on because scene members not online`),
    );
  });
};

export const tsiaBathroom = {
  $: 'tsiaBathroom' as const,
  $init,
  devices: deviceMap(devices),
  level: Level.ROOM as const,
  ...groups,
  ...instances,
  ...properties,
  ...scenes,
};
