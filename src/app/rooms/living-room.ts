/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import {
  outputGrouping,
  trigger,
} from '../../lib/tree/properties/actuators.js';
import { ev1527ButtonX4 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import fetch from 'node-fetch';
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { persistence } from '../persistence.js';
import { promiseGuard } from '../../lib/promise.js';
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
  couchButton: ev1527ButtonX4(ev1527Transport, 822302, logger),
  fan: obiPlug(
    logger,
    persistence,
    timings,
    'fan',
    'livingroom-fan.lan.wurstsalat.cloud'
  ),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'livingroom-standinglamp.lan.wurstsalat.cloud'
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
  couchButton: devices.couchButton.$.i,
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
  window: addMeta({ open: devices.windowSensor.open }, { level: Levels.AREA }),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
  allWindows: inputGrouping(properties.window.open._get),
};

export const scenes = {
  mediaOff: trigger(() => {
    promiseGuard(
      fetch('http://node-red.lan.wurstsalat.cloud:1880/media/off', {
        method: 'POST',
        signal: AbortSignal.timeout(1000),
      })
    );
  }, 'media'),
  mediaOnOrSwitch: trigger(() => {
    promiseGuard(
      fetch('http://node-red.lan.wurstsalat.cloud:1880/media/on-or-switch', {
        method: 'POST',
        signal: AbortSignal.timeout(1000),
      })
    );
  }, 'media'),
};

(async () => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../scenes.js'
  );
  const { instances: testRoomInstances } = await import('./test-room.js');

  instances.couchButton.topLeft.observe(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
  });
  instances.couchButton.topRight.observe(() => properties.fan._set.flip());
  instances.couchButton.bottomLeft.observe(() =>
    scenes.mediaOnOrSwitch._set.trigger()
  );
  instances.couchButton.bottomRight.observe(() =>
    scenes.mediaOff._set.trigger()
  );

  testRoomInstances.espNowButton0.up(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
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
  instances.wallswitchBottom.longPress(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
  });

  instances.wallswitchMiddle.up(() => properties.standingLamp._set.flip());
  instances.wallswitchMiddle.longPress(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.value = true;
  });

  instances.wallswitchTop.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchTop.longPress(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentBright._set.value = true;
  });
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
