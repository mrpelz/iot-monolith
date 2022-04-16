/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import { outputGrouping, scene } from '../../lib/tree/properties/actuators.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import fetch from 'node-fetch';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
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
    'livingroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  couchButton: ev1527ButtonX1(ev1527Transport, 374680, logger),
  fan: obiPlug(
    logger,
    persistence,
    timings,
    'fan',
    'livingroom-fan.iot.wurstsalat.cloud'
  ),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'livingroom-standinglamp.iot.wurstsalat.cloud'
  ),
  wallswitch: shellyi3(
    logger,
    timings,
    'livingroom-wallswitch.iot.wurstsalat.cloud'
  ),
  windowSensor: ev1527WindowSensor(logger, ev1527Transport, 670496),
};

export const instances = {
  couchButton: devices.couchButton.$,
  fanButton: devices.fan.button.$,
  standingLampButton: devices.standingLamp.button.$,
  wallswitchBottom: devices.wallswitch.button2.$,
  wallswitchMiddle: devices.wallswitch.button1.$,
  wallswitchTop: devices.wallswitch.button0.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  fan: devices.fan.relay,
  standingLamp: devices.standingLamp.relay,
  windowOpen: devices.windowSensor.open,
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
};

export const scenes = {
  mediaOff: scene(() => {
    try {
      fetch('http://node-red.lan.wurstsalat.cloud:1880/media/off', {
        method: 'POST',
        timeout: 1000,
      });
    } catch {
      // noop
    }
  }, 'media'),
  mediaOnOrSwitch: scene(() => {
    try {
      fetch('http://node-red.lan.wurstsalat.cloud:1880/media/on-or-switch', {
        method: 'POST',
        timeout: 1000,
      });
    } catch {
      // noop
    }
  }, 'media'),
};

(async () => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentChillax } = await import('../scenes.js');
  const { instances: testRoomInstances } = await import('./test-room.js');

  instances.couchButton.observe(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.trigger();
  });

  testRoomInstances.espNowButton0.up(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.trigger();
  });

  testRoomInstances.espNowButton1.up(() =>
    scenes.mediaOnOrSwitch._set.trigger()
  );
  testRoomInstances.espNowButton1.longPress(() =>
    scenes.mediaOff._set.trigger()
  );

  instances.fanButton.up(() => properties.fan._set.flip());

  instances.standingLampButton.up(() => properties.standingLamp._set.flip());
  instances.standingLampButton.longPress(
    () => (kitchenAdjacentLights._set.value = false)
  );

  instances.wallswitchBottom.up(() => properties.fan._set.flip());
  instances.wallswitchBottom.longPress(
    () => (kitchenAdjacentLights._set.value = false)
  );

  instances.wallswitchMiddle.up(() => properties.standingLamp._set.flip());
  instances.wallswitchMiddle.longPress(
    () => (kitchenAdjacentLights._set.value = false)
  );

  instances.wallswitchTop.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchTop.longPress(
    () => (kitchenAdjacentLights._set.value = false)
  );
})();

export const livingRoom = {
  ...groups,
  ...properties,
  ...scenes,
  devices,
};

metadataStore.set(livingRoom, {
  isDaylit: true,
  level: Levels.ROOM,
  name: 'livingRoom',
});
