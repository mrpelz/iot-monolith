import { epochs } from '../../../lib/epochs.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { inputGrouping, window } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { ev1527Transport } from '../bridges.js';
import { properties as livingRoomProperties } from './living-room.js';

export const devices = {
  ceilingLight: sonoffBasic(
    'lighting',
    'livingroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  floodlight: obiPlug(
    'lighting',
    'mrpelzbedroom-floodlight.lan.wurstsalat.cloud',
    context,
  ),
  wallswitch: shellyi3('livingroom-wallswitch.lan.wurstsalat.cloud', context),
  windowSensor: ev1527WindowSensor(670_496, ev1527Transport, context),
};

export const instances = {
  floodlightButton: devices.floodlight.button.state,
  wallswitchBottom: devices.wallswitch.button2.state,
  wallswitchMiddle: devices.wallswitch.button1.state,
  wallswitchTop: devices.wallswitch.button0.state,
};

export const properties = {
  ceilingLight: devices.ceilingLight.internal.relay,
  floodlight: devices.floodlight.internal.relay,
  floodlightTimer: offTimer(context, epochs.hour, undefined),
  window: window(context, devices.windowSensor),
};

export const groups = {
  allLights: outputGrouping(
    context,
    [properties.ceilingLight, properties.floodlight],
    'lighting',
  ),
  allWindows: inputGrouping(context, properties.window.open.main.state),
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

  instances.floodlightButton.up(() =>
    properties.floodlight.flip.setState.trigger(),
  );
  instances.floodlightButton.longPress(
    kitchenAdjecentsLightsOffKitchenChillaxOn,
  );

  instances.wallswitchBottom.up(() =>
    livingRoomProperties.standingLamp.flip.setState.trigger(),
  );
  instances.wallswitchBottom.longPress(
    kitchenAdjecentsLightsOffKitchenChillaxOn,
  );

  instances.wallswitchMiddle.up(() =>
    properties.floodlight.flip.setState.trigger(),
  );
  instances.wallswitchMiddle.longPress(
    kitchenAdjecentsLightsOffKitchenBrightOn,
  );

  instances.wallswitchTop.up(() =>
    properties.ceilingLight.flip.setState.trigger(),
  );
  instances.wallswitchTop.longPress(kitchenAdjecentsLightsOffKitchenBrightOn);

  properties.floodlight.main.setState.observe((value) => {
    properties.floodlightTimer.active.state.value = value;
  }, true);

  properties.floodlightTimer.state.observe(() => {
    properties.floodlight.main.setState.value = false;
  });
})();

export const office = {
  $: 'office' as const,
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
};
