/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import {
  ev1527ButtonX1,
  ev1527ButtonX4,
} from '../../lib/tree/devices/ev1527-button.js';
import {
  ledGrouping,
  outputGrouping,
} from '../../lib/tree/properties/actuators.js';
import { ev1527Transport } from '../bridges.js';
import { h801 } from '../../lib/tree/devices/h801.js';
import { logger } from '../logging.js';
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
    'diningroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  kallaxLeds: h801(
    logger,
    persistence,
    timings,
    'diningroom-kallaxleds.lan.wurstsalat.cloud'
  ),
  kallaxSideButton: ev1527ButtonX1(ev1527Transport, 992584, logger),
  tableButton: ev1527ButtonX1(ev1527Transport, 307536, logger),
  tableLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'diningroom-tablelight.lan.wurstsalat.cloud'
  ),
  tableMultiButton: ev1527ButtonX4(ev1527Transport, 426506, logger),
  wallswitch: shellyi3(
    logger,
    persistence,
    timings,
    'diningroom-wallswitch.lan.wurstsalat.cloud'
  ),
};

export const instances = {
  kallaxSideButton: devices.kallaxSideButton.$,
  tableButton: devices.tableButton.$,
  tableMultiButton: devices.tableMultiButton.$,
  wallswitchBottom: devices.wallswitch.button1.$,
  wallswitchTop: devices.wallswitch.button0.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  kallaxLedRGB: addMeta(
    {
      b: devices.kallaxLeds.ledB,
      g: devices.kallaxLeds.ledG,
      r: devices.kallaxLeds.ledR,
    },
    { level: Levels.AREA }
  ),
  kallaxLedSide: devices.kallaxLeds.ledW2,
  kallaxLedW: devices.kallaxLeds.ledW1,
  tableLight: devices.tableLight.relay,
};

export const groups = {
  allCeilingLights: outputGrouping([
    properties.ceilingLight,
    properties.tableLight,
  ]),
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.kallaxLedRGB.r,
    properties.kallaxLedRGB.g,
    properties.kallaxLedRGB.b,
    properties.kallaxLedSide,
    properties.kallaxLedW,
    properties.tableLight,
  ]),
  leds: ledGrouping([
    properties.kallaxLedRGB.r,
    properties.kallaxLedRGB.g,
    properties.kallaxLedRGB.b,
    properties.kallaxLedSide,
    properties.kallaxLedW,
  ]),
  whiteLeds: ledGrouping([properties.kallaxLedSide, properties.kallaxLedW]),
};

(async () => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../scenes.js'
  );

  instances.kallaxSideButton.observe(() =>
    properties.kallaxLedSide._set.flip()
  );

  instances.tableButton.observe(() => properties.tableLight._set.flip());

  instances.tableMultiButton.topLeft.observe(() =>
    properties.kallaxLedRGB.r._set.flip()
  );
  instances.tableMultiButton.topRight.observe(() =>
    properties.kallaxLedRGB.g._set.flip()
  );
  instances.tableMultiButton.bottomLeft.observe(() =>
    properties.kallaxLedRGB.b._set.flip()
  );
  instances.tableMultiButton.bottomRight.observe(() =>
    properties.kallaxLedW._set.flip()
  );

  instances.wallswitchBottom.up(() => properties.tableLight._set.flip());
  instances.wallswitchBottom.longPress(() => {
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

export const diningRoom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    isConnectingRoom: true,
    level: Levels.ROOM,
    name: 'diningRoom',
  }
);
