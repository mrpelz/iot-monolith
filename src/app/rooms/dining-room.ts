/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level, symbolLevel } from '../../lib/tree/main-ng.js';
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
    'diningroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  fan: obiPlug(
    logger,
    persistence,
    timings,
    'fan',
    'diningroom-fan.lan.wurstsalat.cloud'
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
  fanButton: devices.fan.$.button.$.i,
  kallaxSideButton: devices.kallaxSideButton.$.i,
  tableButton: devices.tableButton.$.i,
  tableMultiButton: devices.tableMultiButton.$.i,
  wallswitchBottom: devices.wallswitch.$.button1.$.i,
  wallswitchTop: devices.wallswitch.$.button0.$.i,
};

export const properties = {
  ceilingLight: devices.ceilingLight.$.relay,
  fan: devices.fan.$.relay,
  kallaxLedRGB: new Element({
    b: devices.kallaxLeds.$.ledB,
    g: devices.kallaxLeds.$.ledG,
    r: devices.kallaxLeds.$.ledR,
    [symbolLevel]: Level.NONE,
  }),
  kallaxLedSide: devices.kallaxLeds.$.ledW2,
  kallaxLedW: devices.kallaxLeds.$.ledW1,
  tableLight: devices.tableLight.$.relay,
};

export const groups = {
  allCeilingLights: outputGrouping([
    properties.ceilingLight,
    properties.tableLight,
  ]),
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.kallaxLedRGB.$.r,
    properties.kallaxLedRGB.$.g,
    properties.kallaxLedRGB.$.b,
    properties.kallaxLedSide,
    properties.kallaxLedW,
    properties.tableLight,
  ]),
  leds: ledGrouping([
    properties.kallaxLedRGB.$.r,
    properties.kallaxLedRGB.$.g,
    properties.kallaxLedRGB.$.b,
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

  instances.fanButton.up(() => properties.fan.$.flip.$.i.trigger());

  instances.kallaxSideButton.observe(() =>
    properties.kallaxLedSide.$.flip.$.i.trigger()
  );

  instances.tableButton.observe(() =>
    properties.tableLight.$.flip.$.i.trigger()
  );

  instances.tableMultiButton.topLeft.observe(() =>
    properties.kallaxLedRGB.$.r.$.flip.$.i.trigger()
  );
  instances.tableMultiButton.topRight.observe(() =>
    properties.kallaxLedRGB.$.g.$.flip.$.i.trigger()
  );
  instances.tableMultiButton.bottomLeft.observe(() =>
    properties.kallaxLedRGB.$.b.$.flip.$.i.trigger()
  );
  instances.tableMultiButton.bottomRight.observe(() =>
    properties.kallaxLedW.$.flip.$.i.trigger()
  );

  instances.wallswitchBottom.up(() =>
    properties.tableLight.$.flip.$.i.trigger()
  );
  instances.wallswitchBottom.longPress(() => {
    if (kitchenAdjacentLights.$.m.$.i.value) {
      kitchenAdjacentLights.$.m.$.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.$.m.$.setState.value = true;
  });

  instances.wallswitchTop.up(() =>
    properties.ceilingLight.$.flip.$.i.trigger()
  );
  instances.wallswitchTop.longPress(() => {
    if (kitchenAdjacentLights.$.m.$.i.value) {
      kitchenAdjacentLights.$.m.$.setState.value = false;
      return;
    }

    kitchenAdjacentBright.$.m.$.setState.value = true;
  });
})();

export const diningRoom = new Element({
  devices: new Element({ ...devices, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
