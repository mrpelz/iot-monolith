/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../../lib/tree/main.js';
import {
  outputGrouping,
  trigger,
} from '../../lib/tree/properties/actuators.js';
import { ev1527ButtonX4 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
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
  couchButton: devices.couchButton.instance,
  fanButton: devices.fan.button.instance,
  standingLampButton: devices.standingLamp.button.instance,
  wallswitchBottom: devices.wallswitch.button2.instance,
  wallswitchMiddle: devices.wallswitch.button1.instance,
  wallswitchTop: devices.wallswitch.button0.instance,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  fan: devices.fan.relay,
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
})();

export const livingRoom = element({
  devices: element({ ...devices, [symbolLevel]: Level.NONE }),
  scenes: element({ ...scenes, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
