/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../../lib/tree/main-ng.js';
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
  fanButton: devices.fan.button.instance,
  kallaxSideButton: devices.kallaxSideButton.instance,
  tableButton: devices.tableButton.instance,
  tableMultiButton: devices.tableMultiButton.instance,
  wallswitchBottom: devices.wallswitch.button1.instance,
  wallswitchTop: devices.wallswitch.button0.instance,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  fan: devices.fan.relay,
  kallaxLedRGB: element({
    b: devices.kallaxLeds.ledB,
    g: devices.kallaxLeds.ledG,
    r: devices.kallaxLeds.ledR,
    [symbolLevel]: Level.NONE,
  }),
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

  instances.fanButton.up(() => properties.fan.flip.instance.trigger());

  instances.kallaxSideButton.observe(() =>
    properties.kallaxLedSide.flip.instance.trigger()
  );

  instances.tableButton.observe(() =>
    properties.tableLight.flip.instance.trigger()
  );

  instances.tableMultiButton.topLeft.observe(() =>
    properties.kallaxLedRGB.r.flip.instance.trigger()
  );
  instances.tableMultiButton.topRight.observe(() =>
    properties.kallaxLedRGB.g.flip.instance.trigger()
  );
  instances.tableMultiButton.bottomLeft.observe(() =>
    properties.kallaxLedRGB.b.flip.instance.trigger()
  );
  instances.tableMultiButton.bottomRight.observe(() =>
    properties.kallaxLedW.flip.instance.trigger()
  );

  instances.wallswitchBottom.up(() =>
    properties.tableLight.flip.instance.trigger()
  );
  instances.wallswitchBottom.longPress(() => {
    if (kitchenAdjacentLights.main.instance.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });

  instances.wallswitchTop.up(() =>
    properties.ceilingLight.flip.instance.trigger()
  );
  instances.wallswitchTop.longPress(() => {
    if (kitchenAdjacentLights.main.instance.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentBright.main.setState.value = true;
  });
})();

export const diningRoom = element({
  devices: element({ ...devices, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
