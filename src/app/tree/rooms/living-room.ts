/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { promiseGuard } from '../../../lib/promise.js';
import { ev1527ButtonX4 } from '../../../lib/tree/devices/ev1527-button.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Element, Level } from '../../../lib/tree/main.js';
import {
  SceneMember,
  outputGrouping,
  triggerElement,
} from '../../../lib/tree/properties/actuators.js';
import { inputGrouping, window } from '../../../lib/tree/properties/sensors.js';
import { logger } from '../../logging.js';
import { persistence } from '../../persistence.js';
import { timings } from '../../timings.js';
import { ev1527Transport } from '../../tree/bridges.js';

export const devices = {
  ceilingLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'livingroom-ceilinglight.lan.wurstsalat.cloud',
  ),
  couchButton: ev1527ButtonX4(ev1527Transport, 822_302, logger),
  fan: obiPlug(
    logger,
    persistence,
    timings,
    'fan' as const,
    'livingroom-fan.lan.wurstsalat.cloud',
  ),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'livingroom-standinglamp.lan.wurstsalat.cloud',
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
    'livingroom-wallswitch.lan.wurstsalat.cloud',
  ),
  windowSensor: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    670_496,
  ),
};

export const instances = {
  couchButton: devices.couchButton.props.state,
  fanButton: devices.fan.props.button.props.state,
  standingLampButton: devices.standingLamp.props.button.props.state,
  wallswitchBottom: devices.wallswitch.props.button2.props.state,
  wallswitchMiddle: devices.wallswitch.props.button1.props.state,
  wallswitchTop: devices.wallswitch.props.button0.props.state,
};

export const properties = {
  ceilingLight: devices.ceilingLight.props.internal.relay,
  fan: devices.fan.props.internal.relay,
  standingLamp: devices.standingLamp.props.internal.relay,
  window: window(devices.windowSensor),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
  allWindows: inputGrouping(
    properties.window.props.open.props.main.props.state,
  ),
};

const isTerrariumLedsOverride = new BooleanState(false);

export const scenes = {
  mediaOff: triggerElement(() => {
    promiseGuard(
      fetch('http://node-red.lan.wurstsalat.cloud:1880/media/off', {
        method: 'POST',
        signal: AbortSignal.timeout(1000),
      }),
    );

    isTerrariumLedsOverride.value = false;
  }, 'media'),
  mediaOnOrSwitch: triggerElement(() => {
    promiseGuard(
      fetch('http://node-red.lan.wurstsalat.cloud:1880/media/on-or-switch', {
        method: 'POST',
        signal: AbortSignal.timeout(1000),
      }),
    );

    isTerrariumLedsOverride.value = true;
  }, 'media'),
  terrariumLedsOverride: scene(
    [new SceneMember(isTerrariumLedsOverride, true, false)],
    'automation'
  ),
};

(async () => {
  const { kitchenAdjacentLights } = await import('../../tree/groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../../tree/scenes.js'
  );

  instances.couchButton.topLeft.observe(() => {
    if (kitchenAdjacentLights.props.main.props.setState.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });
  instances.couchButton.topRight.observe(() =>
    properties.fan.props.flip.props.setState.trigger(),
  );
  instances.couchButton.bottomLeft.observe(() =>
    scenes.mediaOnOrSwitch.props.main.props.setState.trigger(),
  );
  instances.couchButton.bottomRight.observe(() =>
    scenes.mediaOff.props.main.props.setState.trigger(),
  );

  testRoomInstances.espNowButton0.up(() => {
    if (kitchenAdjacentLights.props.main.props.setState.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });

  testRoomInstances.espNowButton1.up(() =>
    scenes.mediaOnOrSwitch.props.main.props.setState.trigger(),
  );
  testRoomInstances.espNowButton1.longPress(() =>
    scenes.mediaOff.props.main.props.setState.trigger(),
  );

  instances.fanButton.up(() =>
    properties.fan.props.flip.props.setState.trigger(),
  );

  instances.standingLampButton.up(() =>
    properties.standingLamp.props.flip.props.setState.trigger(),
  );
  instances.standingLampButton.longPress(
    () => (kitchenAdjacentLights.props.main.props.setState.value = false),
  );

  instances.wallswitchBottom.up(() =>
    properties.fan.props.flip.props.setState.trigger(),
  );
  instances.wallswitchBottom.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.setState.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });

  instances.wallswitchMiddle.up(() =>
    properties.standingLamp.props.flip.props.setState.trigger(),
  );
  instances.wallswitchMiddle.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.setState.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });

  instances.wallswitchTop.up(() =>
    properties.ceilingLight.props.flip.props.setState.trigger(),
  );
  instances.wallswitchTop.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.setState.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentBright.props.main.props.setState.value = true;
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

export const livingRoom = new Element({
  $: 'livingRoom' as const,
  scenes: new Element({ ...scenes, level: Level.NONE as const }),
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
