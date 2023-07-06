/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
import { properties as livingRoomProperties } from './living-room.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { persistence } from '../persistence.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'livingroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  floodlight: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'mrpelzbedroom-floodlight.lan.wurstsalat.cloud'
  ),
  wallswitch: shellyi3(
    logger,
    persistence,
    timings,
    'livingroom-wallswitch.lan.wurstsalat.cloud'
  ),
  windowSensor: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    670496
  ),
};

export const instances = {
  floodlightButton: devices.floodlight.button.$,
  wallswitchBottom: devices.wallswitch.button2.$,
  wallswitchMiddle: devices.wallswitch.button1.$,
  wallswitchTop: devices.wallswitch.button0.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  floodlight: devices.floodlight.relay,
  floodlightTimer: offTimer(epochs.hour, undefined, [
    'office/floodlightTimer',
    persistence,
  ]),
  window: addMeta({ open: devices.windowSensor.open }, { level: Levels.AREA }),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.floodlight]),
  allWindows: inputGrouping(properties.window.open._get),
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

  instances.floodlightButton.up(() => properties.floodlight._set.flip());
  instances.floodlightButton.longPress(
    kitchenAdjecentsLightsOffKitchenChillaxOn
  );

  instances.wallswitchBottom.up(() =>
    livingRoomProperties.standingLamp._set.flip()
  );
  instances.wallswitchBottom.longPress(
    kitchenAdjecentsLightsOffKitchenChillaxOn
  );

  instances.wallswitchMiddle.up(() => properties.floodlight._set.flip());
  instances.wallswitchMiddle.longPress(
    kitchenAdjecentsLightsOffKitchenBrightOn
  );

  instances.wallswitchTop.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchTop.longPress(kitchenAdjecentsLightsOffKitchenBrightOn);

  properties.floodlight._set.observe((value) => {
    properties.floodlightTimer.active.$.value = value;
  }, true);

  properties.floodlightTimer.$.observe(() => {
    properties.floodlight._set.value = false;
  });
})();

export const office = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    isConnectingRoom: true,
    level: Levels.ROOM,
    name: 'office',
  }
);
