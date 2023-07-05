/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level } from '../../lib/tree/main.js';
import {
  outputGrouping,
  trigger,
} from '../../lib/tree/properties/actuators.js';
import { deviceMap } from '../../lib/tree/elements/device.js';
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
    'lighting' as const,
    'livingroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  couchButton: ev1527ButtonX4(ev1527Transport, 822302, logger),
  fan: obiPlug(
    logger,
    persistence,
    timings,
    'fan' as const,
    'livingroom-fan.lan.wurstsalat.cloud'
  ),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting' as const,
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
  window: new Element({
    level: Level.AREA as const,
    open: devices.windowSensor.props.internal.open,
  }),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
  allWindows: inputGrouping(
    properties.window.props.open.props.main.props.state
  ),
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
    if (kitchenAdjacentLights.props.main.props.setState.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });
  instances.couchButton.topRight.observe(() =>
    properties.fan.props.flip.props.state.trigger()
  );
  instances.couchButton.bottomLeft.observe(() =>
    scenes.mediaOnOrSwitch.props.main.props.state.trigger()
  );
  instances.couchButton.bottomRight.observe(() =>
    scenes.mediaOff.props.main.props.state.trigger()
  );

  testRoomInstances.espNowButton0.up(() => {
    if (kitchenAdjacentLights.props.main.props.setState.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });

  testRoomInstances.espNowButton1.up(() =>
    scenes.mediaOnOrSwitch.props.main.props.state.trigger()
  );
  testRoomInstances.espNowButton1.longPress(() =>
    scenes.mediaOff.props.main.props.state.trigger()
  );

  instances.fanButton.up(() => properties.fan.props.flip.props.state.trigger());

  instances.standingLampButton.up(() =>
    properties.standingLamp.props.flip.props.state.trigger()
  );
  instances.standingLampButton.longPress(
    () => (kitchenAdjacentLights.props.main.props.setState.value = false)
  );

  instances.wallswitchBottom.up(() =>
    properties.fan.props.flip.props.state.trigger()
  );
  instances.wallswitchBottom.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.setState.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });

  instances.wallswitchMiddle.up(() =>
    properties.standingLamp.props.flip.props.state.trigger()
  );
  instances.wallswitchMiddle.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.setState.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });

  instances.wallswitchTop.up(() =>
    properties.ceilingLight.props.flip.props.state.trigger()
  );
  instances.wallswitchTop.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.setState.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentBright.props.main.props.setState.value = true;
  });
})();

export const livingRoom = new Element({
  $: 'livingRoom' as const,
  scenes: new Element({ ...scenes, level: Level.NONE as const }),
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
