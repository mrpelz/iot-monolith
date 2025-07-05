import { epochs } from '../../../lib/epochs.js';
import { makeCustomStringLogger } from '../../../lib/log.js';
import { Timer } from '../../../lib/timer.js';
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
  ceilingLight: shelly1(
    'lighting' as const,
    'mrpelzbathroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  doorSensor: ev1527WindowSensor(720_256, ev1527Transport, context),
  leds: h801('mrpelzbathroom-leds.lan.wurstsalat.cloud', context),
  mirrorHeating: sonoffBasic(
    'heating' as const,
    'mrpelzbathroom-mirrorheating.lan.wurstsalat.cloud',
    context,
  ),
  mirrorLight: sonoffBasic(
    'lighting' as const,
    'mrpelzbathroom-mirrorlight.lan.wurstsalat.cloud',
    context,
  ),
  nightLight: sonoffBasic(
    'lighting' as const,
    'mrpelzbathroom-nightlight.lan.wurstsalat.cloud',
    context,
  ),
  showerButton: ev1527ButtonX1(628_217, ev1527Transport, context),
  wallswitchDoor: shellyi3(
    'mrpelzbathroom-wallswitchdoor.lan.wurstsalat.cloud',
    context,
  ),
};

export const instances = {
  mirrorHeatingButton: devices.mirrorHeating.internal.button,
  mirrorLightButton: devices.mirrorLight.internal.button,
  nightLightButton: devices.nightLight.internal.button,
  showerButton: devices.showerButton,
  wallswitchDoor: devices.wallswitchDoor.internal.button0,
  wallswitchMirrorBottom: devices.wallswitchDoor.internal.button2,
  wallswitchMirrorTop: devices.wallswitchDoor.internal.button1,
};

export const properties = {
  allTimer: offTimer(context, epochs.minute * 30, true),
  ceilingLight: devices.ceilingLight.internal.relay,
  door: door(context, devices.doorSensor, undefined),
  mirrorHeating: devices.mirrorHeating.internal.relay,
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
  allThings: outputGrouping(
    context,
    [
      properties.ceilingLight,
      properties.mirrorHeating,
      properties.mirrorLed,
      properties.mirrorLight,
      properties.nightLight,
    ],
    undefined,
  ),
};

const scenesPartial = {
  astronomicalTwilightLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
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
      new SceneMember(properties.nightLight.main.setState, true, false),
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
      new SceneMember(properties.mirrorLight.main.setState, true, false),
      new SceneMember(properties.nightLight.main.setState, false),
    ],
    'light',
  ),
  nightLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.main.setState, false),
      new SceneMember(properties.mirrorLight.main.setState, false),
      new SceneMember(properties.nightLight.main.setState, true, false),
    ],
    'light',
  ),
};

export const scenes = {
  autoLight: triggerElement(context, 'light'),
  ...scenesPartial,
};

const $init: InitFunction = async (room, introspection) => {
  const {
    mirrorHeatingButton,
    mirrorLightButton,
    nightLightButton,
    showerButton,
    wallswitchDoor,
    wallswitchMirrorBottom,
    wallswitchMirrorTop,
  } = instances;
  const { allLights, allThings } = groups;
  const {
    allTimer,
    ceilingLight,
    door: door_,
    mirrorHeating,
    mirrorLed,
    mirrorLight,
    nightLight,
  } = properties;
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

  mirrorHeatingButton.state.up(() =>
    flipMain(mirrorHeating, () =>
      l(
        `${p(mirrorHeatingButton)} ${mirrorHeatingButton.state.up.name} flipped ${p(mirrorHeating)}`,
      ),
    ),
  );

  mirrorHeatingButton.state.longPress(() =>
    setMain(allThings, false, () =>
      l(
        `${p(mirrorHeatingButton)} ${mirrorHeatingButton.state.longPress.name} turned off ${p(allThings)}`,
      ),
    ),
  );

  mirrorLightButton.state.up(() =>
    flipMain(mirrorLight, () =>
      l(
        `${p(mirrorLightButton)} ${mirrorLightButton.state.up.name} flipped ${p(mirrorLight)}`,
      ),
    ),
  );

  mirrorLightButton.state.longPress(() =>
    setMain(allThings, false, () =>
      l(
        `${p(mirrorLightButton)} ${mirrorLightButton.state.longPress.name} turned off ${p(allThings)}`,
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
    setMain(allThings, false, () =>
      l(
        `${p(nightLightButton)} ${nightLightButton.state.longPress.name} turned off ${p(allThings)}`,
      ),
    ),
  );

  const timer = new Timer(epochs.second * 5);

  showerButton.state.observe(() => {
    const firstPress = !timer.isActive;

    timer.start();

    if (!getMain(allLights)) {
      setMain(nightLighting, true);

      return;
    }

    if (firstPress) {
      setMain(allLights, false);

      return;
    }

    if (
      !getMain(ceilingLight) &&
      !getMain(mirrorLed) &&
      !getMain(mirrorLight) &&
      getMain(nightLight)
    ) {
      setMain(astronomicalTwilightLighting, true);

      return;
    }

    if (
      !getMain(ceilingLight) &&
      !getMain(mirrorLight) &&
      getMain(mirrorLed) &&
      getMain(nightLight)
    ) {
      setMain(nauticalTwilightLighting, true);

      return;
    }

    if (
      !getMain(ceilingLight) &&
      !getMain(nightLight) &&
      getMain(mirrorLed) &&
      getMain(mirrorLight)
    ) {
      setMain(civilTwilightLighting, true);

      return;
    }

    if (
      !getMain(ceilingLight) &&
      getMain(mirrorLed) &&
      getMain(mirrorLight) &&
      getMain(nightLight)
    ) {
      setMain(dayLighting, true);

      return;
    }

    setMain(nightLight, true);
  });

  wallswitchDoor.state.up(() => {
    if (getMain(allThings)) {
      setMain(allThings, false, () =>
        l(
          `${p(wallswitchDoor)} ${wallswitchDoor.state.up.name} turned off ${p(allThings)} because ${p(allThings)} was on`,
        ),
      );

      return;
    }

    setMain(dayLighting, true, () =>
      l(
        `${p(wallswitchDoor)} ${wallswitchDoor.state.up.name} turned on ${p(dayLighting)} because ${p(allThings)} was off`,
      ),
    );
  });

  wallswitchDoor.state.longPress(() =>
    setMain(allThings, false, () =>
      l(
        `${p(wallswitchDoor)} ${wallswitchDoor.state.longPress.name} turned off ${p(allThings)}`,
      ),
    ),
  );

  wallswitchMirrorTop.state.up(() =>
    flipMain(mirrorLight, () =>
      l(
        `${p(wallswitchMirrorTop)} ${wallswitchMirrorTop.state.up.name} flipped ${p(mirrorLight)}`,
      ),
    ),
  );

  wallswitchMirrorTop.state.longPress(() =>
    setMain(allThings, false, () =>
      l(
        `${p(wallswitchMirrorTop)} ${wallswitchMirrorTop.state.longPress.name} turned off ${p(allThings)}`,
      ),
    ),
  );

  wallswitchMirrorBottom.state.up(() => {
    if (getMain(allThings)) {
      setMain(allThings, false, () =>
        l(
          `${p(wallswitchMirrorBottom)} ${wallswitchMirrorBottom.state.up.name} turned off ${p(allThings)} because ${p(allThings)} was on`,
        ),
      );

      return;
    }

    setMain(nightLighting, true, () =>
      l(
        `${p(wallswitchMirrorBottom)} ${wallswitchMirrorBottom.state.up.name} turned on ${p(nightLighting)} because ${p(allThings)} was off`,
      ),
    );
  });

  wallswitchMirrorBottom.state.longPress(() =>
    setMain(allThings, false, () =>
      l(
        `${p(wallswitchMirrorBottom)} ${wallswitchMirrorBottom.state.longPress.name} turned off ${p(allThings)}`,
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

  allThings.main.setState.observe((value) => {
    properties.allTimer.state[value ? 'start' : 'stop']();
  }, true);

  allTimer.state.observe(() =>
    setMain(allThings, false, () =>
      l(`${p(allThings)} was turned off because ${p(allTimer)} ran out`),
    ),
  );

  allLights.main.setState.observe((value) => {
    setMain(mirrorHeating, value, () =>
      l(
        `${p(mirrorHeating)} was turned ${value ? 'on' : 'off'} because ${p(allLights)} was turned ${value ? 'on' : 'off'}`,
      ),
    );
  });

  autoLight.state.observe(() => {
    let failover = false;

    const elevation = sunElevation();

    if (isNight(elevation)) {
      if (devices.nightLight.online.main.state.value) {
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
        devices.leds.online.main.state.value ||
        devices.nightLight.online.main.state.value
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
        devices.leds.online.main.state.value ||
        devices.mirrorLight.online.main.state.value
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
      (devices.leds.online.main.state.value ||
        devices.mirrorLight.online.main.state.value ||
        devices.nightLight.online.main.state.value)
    ) {
      setMain(civilTwilightLighting, true, () =>
        l(
          `${p(civilTwilightLighting)} was turned on because sun elevation is ${elevation}`,
        ),
      );

      return;
    }

    if (
      devices.ceilingLight.online.main.state.value ||
      devices.leds.online.main.state.value ||
      devices.mirrorLight.online.main.state.value
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

export const mrpelzBathroom = {
  $: 'mrpelzBathroom' as const,
  $init,
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...instances,
  ...properties,
  ...scenes,
};
