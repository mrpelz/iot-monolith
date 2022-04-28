/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
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
    'diningroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  fan: obiPlug(
    logger,
    persistence,
    timings,
    'fan',
    'diningroom-fan.iot.wurstsalat.cloud'
  ),
  kallaxLeds: h801(
    logger,
    persistence,
    timings,
    'diningroom-kallaxleds.iot.wurstsalat.cloud'
  ),
  kallaxSideButton: ev1527ButtonX1(ev1527Transport, 992584, logger),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'diningroom-standinglamp.iot.wurstsalat.cloud'
  ),
  tableButton: ev1527ButtonX1(ev1527Transport, 307536, logger),
  tableLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'diningroom-tablelight.iot.wurstsalat.cloud'
  ),
  tableMultiButton: ev1527ButtonX4(ev1527Transport, 426506, logger),
  wallswitch: shellyi3(
    logger,
    timings,
    'diningroom-wallswitch.iot.wurstsalat.cloud'
  ),
};

export const instances = {
  fanButton: devices.fan.button.$,
  kallaxSideButton: devices.kallaxSideButton.$,
  standingLampButton: devices.standingLamp.button.$,
  tableButton: devices.tableButton.$,
  tableMultiButton: devices.tableMultiButton.$,
  wallswitchBottom: devices.wallswitch.button1.$,
  wallswitchTop: devices.wallswitch.button0.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  fan: devices.fan.relay,
  kallaxLedB: devices.kallaxLeds.ledB,
  kallaxLedG: devices.kallaxLeds.ledG,
  kallaxLedR: devices.kallaxLeds.ledR,
  kallaxLedSide: devices.kallaxLeds.ledW2,
  kallaxLedW: devices.kallaxLeds.ledW1,
  standingLamp: devices.standingLamp.relay,
  tableLight: devices.tableLight.relay,
};

export const groups = {
  allCeilingLights: outputGrouping([
    properties.ceilingLight,
    properties.tableLight,
  ]),
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.kallaxLedB,
    properties.kallaxLedG,
    properties.kallaxLedR,
    properties.kallaxLedSide,
    properties.kallaxLedW,
    properties.standingLamp,
    properties.tableLight,
  ]),
  leds: ledGrouping([
    properties.kallaxLedB,
    properties.kallaxLedG,
    properties.kallaxLedR,
    properties.kallaxLedSide,
    properties.kallaxLedW,
  ]),
  whiteLeds: ledGrouping([properties.kallaxLedSide, properties.kallaxLedW]),
};

(async () => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentChillax } = await import('../scenes.js');

  instances.fanButton.up(() => properties.fan._set.flip());

  instances.kallaxSideButton.observe(() =>
    properties.kallaxLedSide._set.flip()
  );

  instances.standingLampButton.up(() => properties.standingLamp._set.flip());
  instances.standingLampButton.longPress(
    () => (kitchenAdjacentLights._set.value = false)
  );

  instances.tableButton.observe(() => properties.tableLight._set.flip());

  instances.tableMultiButton.topLeft.observe(() =>
    properties.kallaxLedR._set.flip()
  );
  instances.tableMultiButton.topRight.observe(() =>
    properties.kallaxLedG._set.flip()
  );
  instances.tableMultiButton.bottomLeft.observe(() =>
    properties.kallaxLedB._set.flip()
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

    kitchenAdjacentChillax._set.trigger();
  });

  instances.wallswitchTop.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchTop.longPress(() => {
    if (kitchenAdjacentLights._set.value) {
      kitchenAdjacentLights._set.value = false;
      return;
    }

    kitchenAdjacentChillax._set.trigger();
  });
})();

export const diningRoom = {
  devices,
  ...groups,
  ...properties,
};

metadataStore.set(diningRoom, {
  isConnectingRoom: true,
  level: Levels.ROOM,
  name: 'diningRoom',
});
