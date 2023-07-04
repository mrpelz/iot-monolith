/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level } from '../../lib/tree/main.js';
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
  fanButton: devices.fan.props.button.props.state,
  kallaxSideButton: devices.kallaxSideButton.props.state,
  tableButton: devices.tableButton.props.state,
  tableMultiButton: devices.tableMultiButton.props.state,
  wallswitchBottom: devices.wallswitch.props.button1.props.state,
  wallswitchTop: devices.wallswitch.props.button0.props.state,
};

export const properties = {
  ceilingLight: devices.ceilingLight.props.relay,
  fan: devices.fan.props.relay,
  kallaxLedRGB: new Element({
    b: devices.kallaxLeds.props.ledB,
    g: devices.kallaxLeds.props.ledG,
    level: Level.NONE as const,
    r: devices.kallaxLeds.props.ledR,
  }),
  kallaxLedSide: devices.kallaxLeds.props.ledW2,
  kallaxLedW: devices.kallaxLeds.props.ledW1,
  tableLight: devices.tableLight.props.relay,
};

export const groups = {
  allCeilingLights: outputGrouping([
    properties.ceilingLight,
    properties.tableLight,
  ]),
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.kallaxLedRGB.props.r,
    properties.kallaxLedRGB.props.g,
    properties.kallaxLedRGB.props.b,
    properties.kallaxLedSide,
    properties.kallaxLedW,
    properties.tableLight,
  ]),
  leds: ledGrouping([
    properties.kallaxLedRGB.props.r,
    properties.kallaxLedRGB.props.g,
    properties.kallaxLedRGB.props.b,
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

  instances.fanButton.up(() => properties.fan.props.flip.props.state.trigger());

  instances.kallaxSideButton.observe(() =>
    properties.kallaxLedSide.props.flip.props.state.trigger()
  );

  instances.tableButton.observe(() =>
    properties.tableLight.props.flip.props.state.trigger()
  );

  instances.tableMultiButton.topLeft.observe(() =>
    properties.kallaxLedRGB.props.r.props.flip.props.state.trigger()
  );
  instances.tableMultiButton.topRight.observe(() =>
    properties.kallaxLedRGB.props.g.props.flip.props.state.trigger()
  );
  instances.tableMultiButton.bottomLeft.observe(() =>
    properties.kallaxLedRGB.props.b.props.flip.props.state.trigger()
  );
  instances.tableMultiButton.bottomRight.observe(() =>
    properties.kallaxLedW.props.flip.props.state.trigger()
  );

  instances.wallswitchBottom.up(() =>
    properties.tableLight.props.flip.props.state.trigger()
  );
  instances.wallswitchBottom.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.state.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });

  instances.wallswitchTop.up(() =>
    properties.ceilingLight.props.flip.props.state.trigger()
  );
  instances.wallswitchTop.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.state.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentBright.props.main.props.setState.value = true;
  });
})();

export const diningRoom = new Element({
  devices: new Element({ ...devices, level: Level.NONE as const }),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
