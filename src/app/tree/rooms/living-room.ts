import { epochs } from '../../../lib/epochs.js';
import { maxmin, round } from '../../../lib/number.js';
import { promiseGuard } from '../../../lib/promise.js';
import { BooleanState } from '../../../lib/state.js';
import { ev1527ButtonX4 } from '../../../lib/tree/devices/ev1527-button.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import {
  outputGrouping,
  scene,
  SceneMember,
  triggerElement,
} from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { context } from '../../context.js';
import { every2Minutes } from '../../timings.js';
import { overriddenLed, sunlightLeds } from '../../util.js';
import { ev1527Transport } from '../bridges.js';
import { groups as hallwayGroups } from './hallway.js';

export const devices = {
  couchButton: ev1527ButtonX4(822_302, ev1527Transport, context),
  standingLamp: obiPlug(
    'lighting' as const,
    'livingroom-standinglamp.lan.wurstsalat.cloud',
    context,
  ),
  terrariumLeds: h801('office-workbenchleds.lan.wurstsalat.cloud', context),
  wallswitch: shellyi3('diningroom-wallswitch.lan.wurstsalat.cloud', context),
};

export const instances = {
  couchButton: devices.couchButton.state,
  standingLampButton: devices.standingLamp.internal.button.state,
  wallswitchBottom: devices.wallswitch.internal.button1.state,
  wallswitchTop: devices.wallswitch.internal.button0.state,
};

const isTerrariumLedsOverride = new BooleanState(false);

export const properties = {
  overrideTimer: offTimer(context, epochs.hour * 12, true),
  standingLamp: devices.standingLamp.internal.relay,
  terrariumLedRed: overriddenLed(
    context,
    devices.terrariumLeds.internal.ledB,
    isTerrariumLedsOverride,
  ),
  terrariumLedTop: overriddenLed(
    context,
    devices.terrariumLeds.internal.ledR,
    isTerrariumLedsOverride,
  ),
};

export const groups = {
  allLights: outputGrouping(
    context,
    [
      properties.standingLamp,
      properties.terrariumLedRed,
      properties.terrariumLedTop,
    ],
    'lighting',
  ),
};

export const scenes = {
  mediaOff: triggerElement(
    context,
    async () => {
      await promiseGuard(
        fetch('http://node-red.lan.wurstsalat.cloud:1880/media/off', {
          method: 'POST',
          signal: AbortSignal.timeout(1000),
        }),
      );

      isTerrariumLedsOverride.value = false;
    },
    'media',
  ),
  mediaOnOrSwitch: triggerElement(
    context,
    async () => {
      await promiseGuard(
        fetch('http://node-red.lan.wurstsalat.cloud:1880/media/on-or-switch', {
          method: 'POST',
          signal: AbortSignal.timeout(1000),
        }),
      );

      isTerrariumLedsOverride.value = true;
    },
    'media',
  ),
  terrariumLedsOverride: scene(
    context,
    [new SceneMember(isTerrariumLedsOverride, true, false)],
    'automation',
  ),
};

(async () => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../scenes.js'
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
  instances.couchButton.topRight.observe(() => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentBright.main.setState.value = true;
  });
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

  const handleTerrariumLedsAutomation = () => {
    if (isTerrariumLedsOverride.value) {
      return;
    }

    const { terrariumLeds } = devices;

    const { red: red_, white: white_ } = sunlightLeds();

    const red = round(red_, 3);
    const white = round(white_, 3);

    const brightnessRed = red ? maxmin(red + 0.18) : 0;
    const brightnessWhite = white ? maxmin(white + 0.18) : 0;

    if (!terrariumLeds.online.main.state.value) return;

    terrariumLeds.internal.ledB.brightness.setState.value = brightnessRed;
    terrariumLeds.internal.ledR.brightness.setState.value = brightnessWhite;
  };

  isTerrariumLedsOverride.observe((value) => {
    properties.overrideTimer.active.state.value = value;

    if (!value) return;

    devices.terrariumLeds.internal.ledR.main.setState.value = false;
    devices.terrariumLeds.internal.ledB.main.setState.value = false;
  });

  isTerrariumLedsOverride.observe(handleTerrariumLedsAutomation);
  every2Minutes.addTask(handleTerrariumLedsAutomation);
  devices.terrariumLeds.online.main.state.observe((isOnline) => {
    if (!isOnline) return;

    handleTerrariumLedsAutomation();
  });

  properties.overrideTimer.state.observe(
    () => (isTerrariumLedsOverride.value = false),
  );
})();

export const livingRoom = {
  $: 'livingRoom' as const,
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  ...scenes,
};
