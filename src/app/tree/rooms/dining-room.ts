/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  ev1527ButtonX1,
  ev1527ButtonX4,
} from '../../../lib/tree/devices/ev1527-button.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import {
  ledGrouping,
  outputGrouping,
} from '../../../lib/tree/properties/actuators.js';
import { logger } from '../../logging.js';
import { persistence } from '../../persistence.js';
import { timings } from '../../timings.js';
import { ev1527Transport } from '../bridges.js';

export const devices = {
  ceilingLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'diningroom-ceilinglight.lan.wurstsalat.cloud',
  ),
  fan: obiPlug(
    logger,
    persistence,
    timings,
    'fan' as const,
    'diningroom-fan.lan.wurstsalat.cloud',
  ),
  kallaxLeds: h801(
    logger,
    persistence,
    timings,
    'diningroom-kallaxleds.lan.wurstsalat.cloud',
  ),
  kallaxSideButton: ev1527ButtonX1(ev1527Transport, 992_584, logger),
  tableButton: ev1527ButtonX1(ev1527Transport, 307_536, logger),
  tableLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'diningroom-tablelight.lan.wurstsalat.cloud',
  ),
  tableMultiButton: ev1527ButtonX4(ev1527Transport, 426_506, logger),
  wallswitch: shellyi3(
    logger,
    persistence,
    timings,
    'diningroom-wallswitch.lan.wurstsalat.cloud',
  ),
};

export const instances = {
  fanButton: devices.fan.button.state,
  kallaxSideButton: devices.kallaxSideButton.state,
  tableButton: devices.tableButton.state,
  tableMultiButton: devices.tableMultiButton.state,
  wallswitchBottom: devices.wallswitch.button1.state,
  wallswitchTop: devices.wallswitch.button0.state,
};

export const properties = {
  ceilingLight: devices.ceilingLight.internal.relay,
  fan: devices.fan.internal.relay,
  kallaxLedRGB: {
    $: 'rgb' as const,
    b: devices.kallaxLeds.internal.ledB,
    g: devices.kallaxLeds.internal.ledG,
    level: Level.NONE as const,
    r: devices.kallaxLeds.internal.ledR,
  },
  kallaxLedSide: devices.kallaxLeds.internal.ledW2,
  kallaxLedW: devices.kallaxLeds.internal.ledW1,
  tableLight: devices.tableLight.internal.relay,
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

const callback: InitFunction = async () => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../scenes.js'
  );

  instances.fanButton.up(() => properties.fan.flip.setState.trigger());

  instances.kallaxSideButton.observe(() =>
    properties.kallaxLedSide.flip.setState.trigger(),
  );

  instances.tableButton.observe(() =>
    properties.tableLight.flip.setState.trigger(),
  );

  instances.tableMultiButton.topLeft.observe(() =>
    properties.kallaxLedRGB.r.flip.setState.trigger(),
  );
  instances.tableMultiButton.topRight.observe(() =>
    properties.kallaxLedRGB.g.flip.setState.trigger(),
  );
  instances.tableMultiButton.bottomLeft.observe(() =>
    properties.kallaxLedRGB.b.flip.setState.trigger(),
  );
  instances.tableMultiButton.bottomRight.observe(() =>
    properties.kallaxLedW.flip.setState.trigger(),
  );

  instances.wallswitchBottom.up(() =>
    properties.tableLight.flip.setState.trigger(),
  );
  instances.wallswitchBottom.longPress(() => {
    if (kitchenAdjacentLights.main.state.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });

  instances.wallswitchTop.up(() =>
    properties.ceilingLight.flip.setState.trigger(),
  );
  instances.wallswitchTop.longPress(() => {
    if (kitchenAdjacentLights.main.state.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentBright.main.setState.value = true;
  });
};

export const diningRoom = {
  $: 'diningRoom' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  $init: callback,
  level: Level.ROOM as const,
};
