/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import {
  led,
  ledGrouping,
  output,
  outputGrouping,
} from '../../lib/tree/properties/actuators.js';
import { Timer } from '../../lib/timer.js';
import { epochs } from '../../lib/epochs.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: sonoffBasic(
    logger,
    timings,
    'livingroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  fan: obiPlug(logger, timings, 'livingroom-fan.iot.wurstsalat.cloud'),
  standingLamp: obiPlug(
    logger,
    timings,
    'livingroom-standinglamp.iot.wurstsalat.cloud'
  ),
  wallswitch: shellyi3(
    logger,
    timings,
    'livingroom-wallswitch.iot.wurstsalat.cloud'
  ),
};

export const instances = {
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
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
};

(() => {
  const timer = new Timer(epochs.second * 10);

  const allOffOr = (
    light:
      | ReturnType<typeof output>
      | ReturnType<typeof led>
      | ReturnType<typeof outputGrouping>
      | ReturnType<typeof ledGrouping>
  ) => {
    if (timer.isRunning) {
      light._set.flip();

      timer.start();

      return;
    }

    if (groups.allLights._set.value) {
      groups.allLights._set.value = false;
    } else {
      light._set.value = true;
    }

    timer.start();
  };

  instances.fanButton.up(() => properties.fan._set.flip());

  instances.standingLampButton.up(() => allOffOr(properties.standingLamp));

  instances.wallswitchBottom.up(() => allOffOr(properties.fan));

  instances.wallswitchMiddle.up(() => allOffOr(properties.standingLamp));

  instances.wallswitchTop.up(() => allOffOr(properties.ceilingLight));
})();

export const livingRoom = {
  ...groups,
  ...properties,
  devices,
};

metadataStore.set(livingRoom, {
  isDaylit: true,
  level: Levels.ROOM,
  name: 'livingRoom',
});
