/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import {
  SceneMember,
  outputGrouping,
  scene,
  trigger,
} from '../../lib/tree/properties/actuators.js';
import { every5Seconds, timings } from '../timings.js';
import {
  relativeSunElevationOfDay,
  relativeSunElevationOfNight,
} from '../util.js';
import { BooleanState } from '../../lib/state.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527ButtonX4 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import fetch from 'node-fetch';
import { h801 } from '../../lib/tree/devices/h801.js';
import { groups as hallwayGroups } from './hallway.js';
import { logger } from '../logging.js';
import { maxmin } from '../../lib/number.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { persistence } from '../persistence.js';
import { promiseGuard } from '../../lib/promise.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';

export const devices = {
  couchButton: ev1527ButtonX4(ev1527Transport, 822302, logger),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'livingroom-standinglamp.lan.wurstsalat.cloud'
  ),
  terrariumLeds: h801(
    logger,
    persistence,
    timings,
    'office-workbenchleds.lan.wurstsalat.cloud'
  ),
  wallswitch: shellyi3(
    logger,
    persistence,
    timings,
    'diningroom-wallswitch.lan.wurstsalat.cloud'
  ),
};

export const instances = {
  couchButton: devices.couchButton.$instance,
  fanButton: devices.fan.button.$,
  standingLampButton: devices.standingLamp.button.$,
  wallswitchBottom: devices.wallswitch.button1.$,
  wallswitchTop: devices.wallswitch.button0.$,
};

export const properties = {
  overrideTimer: offTimer(epochs.hour * 12, true, [
    'livingRoom/terrariumLedsOverrideTimer',
    persistence,
  ]),
  standingLamp: devices.standingLamp.relay,
  terrariumLedRed: devices.terrariumLeds.ledB,
  terrariumLedTop: devices.terrariumLeds.ledR,
};

export const groups = {
  allLights: outputGrouping([
    properties.standingLamp,
    properties.terrariumLedRed,
    properties.terrariumLedTop,
  ]),
};

const isTerrariumLedsOverride = new BooleanState(false);

export const scenes = {
  mediaOff: trigger(async () => {
    await promiseGuard(
      fetch('http://node-red.lan.wurstsalat.cloud:1880/media/off', {
        method: 'POST',
        signal: AbortSignal.timeout(1000),
      })
    );

    isTerrariumLedsOverride.value = false;
  }, 'media'),
  mediaOnOrSwitch: trigger(async () => {
    await promiseGuard(
      fetch('http://node-red.lan.wurstsalat.cloud:1880/media/on-or-switch', {
        method: 'POST',
        signal: AbortSignal.timeout(1000),
      })
    );

    isTerrariumLedsOverride.value = true;
  }, 'media'),
  terrariumLedsOverride: scene(
    [new SceneMember(isTerrariumLedsOverride, true, false)],
    'automation'
  ),
};

(async () => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../scenes.js'
  );

  const kitchenAdjecentsLightsOffKitchenBrightOn = () => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentBright._set.value = true;
  };

  const kitchenAdjecentsLightsOffKitchenChillaxOn = () => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
  };

  instances.couchButton.topLeft.observe(
    kitchenAdjecentsLightsOffKitchenChillaxOn
  );
  instances.couchButton.topRight.observe(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentBright._set.value = true;
  });
  instances.couchButton.bottomLeft.observe(() =>
    scenes.mediaOnOrSwitch._set.trigger()
  );
  instances.couchButton.bottomRight.observe(() =>
    scenes.mediaOff._set.trigger()
  );

  instances.standingLampButton.up(() => properties.standingLamp._set.flip());
  instances.standingLampButton.longPress(() =>
    kitchenAdjacentLights._set.flip()
  );

  instances.wallswitchBottom.up(() => properties.standingLamp._set.flip());
  instances.wallswitchBottom.longPress(
    kitchenAdjecentsLightsOffKitchenChillaxOn
  );

  instances.wallswitchTop.up(() => hallwayGroups.ceilingLight._set.flip());
  instances.wallswitchTop.longPress(kitchenAdjecentsLightsOffKitchenBrightOn);

  const handleTerrariumLedsAutomation = () => {
    if (isTerrariumLedsOverride.value) {
      return;
    }

    const relativeSunElevationDay = relativeSunElevationOfDay();
    const brightnessDay = relativeSunElevationDay
      ? maxmin(relativeSunElevationDay + 0.18)
      : 0;
    properties.terrariumLedTop.brightness._set.value = brightnessDay;

    const relativeSunElevationNight = relativeSunElevationOfNight();
    const brightnessNight = relativeSunElevationNight
      ? maxmin(relativeSunElevationNight + 0.18)
      : 0;
    properties.terrariumLedRed.brightness._set.value = brightnessNight;
  };

  isTerrariumLedsOverride.observe((value) => {
    properties.overrideTimer.active.$.value = value;

    if (!value) return;

    properties.terrariumLedRed._set.value = false;
    properties.terrariumLedTop._set.value = false;
  });

  isTerrariumLedsOverride.observe(handleTerrariumLedsAutomation);
  every5Seconds.addTask(handleTerrariumLedsAutomation);

  properties.overrideTimer.$.observe(
    () => (isTerrariumLedsOverride.value = false)
  );
})();

export const livingRoom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
    ...scenes,
  },
  {
    isDaylit: true,
    level: Levels.ROOM,
    name: 'livingRoom',
  }
);
