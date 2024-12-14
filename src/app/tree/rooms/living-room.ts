import { promiseGuard } from '../../../lib/promise.js';
import { ev1527ButtonX4 } from '../../../lib/tree/devices/ev1527-button.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
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
  couchButton: devices.couchButton.state,
  fanButton: devices.fan.button.state,
  standingLampButton: devices.standingLamp.button.state,
  wallswitchBottom: devices.wallswitch.button2.state,
  wallswitchMiddle: devices.wallswitch.button1.state,
  wallswitchTop: devices.wallswitch.button0.state,
};

export const properties = {
  ceilingLight: devices.ceilingLight.internal.relay,
  fan: devices.fan.internal.relay,
  standingLamp: devices.standingLamp.internal.relay,
  window: window(devices.windowSensor),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
  allWindows: inputGrouping(properties.window.open.main.state),
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
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });
  instances.couchButton.topRight.observe(() =>
    properties.fan.flip.setState.trigger(),
  );
  instances.couchButton.bottomLeft.observe(() =>
    scenes.mediaOnOrSwitch.main.setState.trigger(),
  );
  instances.couchButton.bottomRight.observe(() =>
    scenes.mediaOff.main.setState.trigger(),
  );

  testRoomInstances.espNowButton0.up(() => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });

  testRoomInstances.espNowButton1.up(() =>
    scenes.mediaOnOrSwitch.main.setState.trigger(),
  );
  testRoomInstances.espNowButton1.longPress(() =>
    scenes.mediaOff.main.setState.trigger(),
  );

  instances.fanButton.up(() => properties.fan.flip.setState.trigger());

  instances.standingLampButton.up(() =>
    properties.standingLamp.flip.setState.trigger(),
  );
  instances.standingLampButton.longPress(
    () => (kitchenAdjacentLights.main.setState.value = false),
  );

  instances.wallswitchBottom.up(() => properties.fan.flip.setState.trigger());
  instances.wallswitchBottom.longPress(() => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });

  instances.wallswitchMiddle.up(() =>
    properties.standingLamp.flip.setState.trigger(),
  );
  instances.wallswitchMiddle.longPress(() => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });

  instances.wallswitchTop.up(() =>
    properties.ceilingLight.flip.setState.trigger(),
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

export const livingRoom = {
  $: 'livingRoom' as const,
  scenes: {
    $: 'scenes' as const,
    ...scenes,
    level: Level.NONE as const,
  },
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
};
