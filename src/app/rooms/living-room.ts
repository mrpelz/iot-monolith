/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../../lib/tree/main.js';
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
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
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
  couchButton: devices.couchButton.instance,
  fanButton: devices.fan.button.instance,
  standingLampButton: devices.standingLamp.button.instance,
  wallswitchBottom: devices.wallswitch.button2.instance,
  wallswitchMiddle: devices.wallswitch.button1.instance,
  wallswitchTop: devices.wallswitch.button0.instance,
};

export const properties = {
  overrideTimer: offTimer(epochs.hour * 12, true, [
    'livingRoom/terrariumLedsOverrideTimer',
    persistence,
  ]),
  standingLamp: devices.standingLamp.relay,
  window: element({
    open: devices.windowSensor.open,
    [symbolLevel]: Level.AREA,
  }),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
  allWindows: inputGrouping(properties.window.open.main.instance),
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

  instances.couchButton.topLeft.observe(() => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });
  instances.couchButton.topRight.observe(() =>
    properties.fan.flip.instance.trigger()
  );
  instances.couchButton.bottomLeft.observe(() =>
    scenes.mediaOnOrSwitch.main.instance.trigger()
  );
  instances.couchButton.bottomRight.observe(() =>
    scenes.mediaOff.main.instance.trigger()
  );

  testRoomInstances.espNowButton0.up(() => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });

  testRoomInstances.espNowButton1.up(() =>
    scenes.mediaOnOrSwitch.main.instance.trigger()
  );
  testRoomInstances.espNowButton1.longPress(() =>
    scenes.mediaOff.main.instance.trigger()
  );

  instances.fanButton.up(() => properties.fan.flip.instance.trigger());

  instances.standingLampButton.up(() =>
    properties.standingLamp.flip.instance.trigger()
  );
  instances.standingLampButton.longPress(
    () => (kitchenAdjacentLights.main.setState.value = false)
  );

  instances.wallswitchBottom.up(() => properties.fan.flip.instance.trigger());
  instances.wallswitchBottom.longPress(() => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });

  instances.wallswitchMiddle.up(() =>
    properties.standingLamp.flip.instance.trigger()
  );
  instances.wallswitchMiddle.longPress(() => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });

  instances.wallswitchTop.up(() =>
    properties.ceilingLight.flip.instance.trigger()
  );
  instances.wallswitchTop.longPress(() => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentBright.main.setState.value = true;
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

export const livingRoom = element({
  devices: element({ ...devices, [symbolLevel]: Level.NONE }),
  scenes: element({ ...scenes, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
