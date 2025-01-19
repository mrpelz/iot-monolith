import { promiseGuard } from '../../../lib/promise.js';
import { ev1527ButtonX4 } from '../../../lib/tree/devices/ev1527-button.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import {
  SceneMember,
  outputGrouping,
  triggerElement,
} from '../../../lib/tree/properties/actuators.js';
import { context } from '../../context.js';
import { ev1527Transport } from '../bridges.js';
import { groups as hallwayGroups } from './hallway.js';

export const devices = {
  couchButton: ev1527ButtonX4(822_302, ev1527Transport, context),
  standingLamp: obiPlug(
    'lighting' as const,
    'livingroom-standinglamp.lan.wurstsalat.cloud',
    context,
  ),
  wallswitch: shellyi3('diningroom-wallswitch.lan.wurstsalat.cloud', context),
};

export const instances = {
  couchButton: devices.couchButton.state,
  standingLampButton: devices.standingLamp.button.state,
  wallswitchBottom: devices.wallswitch.button1.state,
  wallswitchTop: devices.wallswitch.button0.state,
};

export const properties = {
  standingLamp: devices.standingLamp.internal.relay,
};

export const groups = {
  allLights: outputGrouping([properties.standingLamp]),
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

  const kitchenAdjecentsLightsOffKitchenBrightOn = () => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentBright.main.setState.value = true;
  };

  const kitchenAdjecentsLightsOffKitchenChillaxOn = () => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  };

  instances.couchButton.topLeft.observe(
    kitchenAdjecentsLightsOffKitchenChillaxOn,
  );
  instances.couchButton.topRight.observe(
    kitchenAdjecentsLightsOffKitchenBrightOn,
  );
  instances.couchButton.bottomLeft.observe(() =>
    scenes.mediaOnOrSwitch.main.setState.trigger(),
  );
  instances.couchButton.bottomRight.observe(() =>
    scenes.mediaOff.main.setState.trigger(),
  );

  instances.standingLampButton.up(() =>
    properties.standingLamp.flip.setState.trigger(),
  );
  instances.standingLampButton.longPress(() =>
    kitchenAdjacentLights.flip.setState.trigger(),
  );

  instances.wallswitchBottom.up(() =>
    properties.standingLamp.flip.setState.trigger(),
  );
  instances.wallswitchBottom.longPress(
    kitchenAdjecentsLightsOffKitchenChillaxOn,
  );

  instances.wallswitchTop.up(() =>
    hallwayGroups.ceilingLight.flip.setState.trigger(),
  );
  instances.wallswitchTop.longPress(kitchenAdjecentsLightsOffKitchenBrightOn);
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
