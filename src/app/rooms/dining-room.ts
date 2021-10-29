/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import {
  ledGrouping,
  outputGrouping,
} from '../../lib/tree/properties/actuators.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { h801 } from '../../lib/tree/devices/h801.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: sonoffBasic(
    logger,
    timings,
    'diningroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  couchButton: ev1527ButtonX1(ev1527Transport, 374680, logger),
  fan: obiPlug(logger, timings, 'diningroom-fan.iot.wurstsalat.cloud'),
  fanRfButton: ev1527ButtonX1(ev1527Transport, 307536, logger),
  kallaxLeds: h801(
    logger,
    timings,
    'diningroom-kallaxleds.iot.wurstsalat.cloud'
  ),
  kallaxSideButton: ev1527ButtonX1(ev1527Transport, 992584, logger),
  standingLamp: obiPlug(
    logger,
    timings,
    'diningroom-standinglamp.iot.wurstsalat.cloud'
  ),
  tableLight: sonoffBasic(
    logger,
    timings,
    'diningroom-tablelight.iot.wurstsalat.cloud'
  ),
  wallswitch: shellyi3(
    logger,
    timings,
    'diningroom-wallswitch.iot.wurstsalat.cloud'
  ),
};

export const instances = {
  couchButton: devices.couchButton.$,
  fanButton: devices.fan.button.$,
  fanRfButton: devices.fanRfButton.$,
  kallaxSideButton: devices.kallaxSideButton.$,
  standingLampButton: devices.standingLamp.button.$,
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
    properties.tableLight,
    properties.standingLamp,
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

(() => {
  const allOffOr = (cb: () => void) => {
    if (groups.allLights._get.value) {
      groups.allLights._set.value = false;

      return;
    }

    cb();
  };

  instances.couchButton.observe(() =>
    allOffOr(() => (properties.standingLamp._set.value = true))
  );

  instances.fanButton.up(() => properties.fan._set.flip());

  instances.fanRfButton.observe(() => properties.fan._set.flip());

  instances.kallaxSideButton.observe(() =>
    allOffOr(() => (properties.kallaxLedSide._set.value = true))
  );

  instances.standingLampButton.up(() =>
    allOffOr(() => (properties.standingLamp._set.value = true))
  );

  instances.wallswitchBottom.up(() =>
    allOffOr(() => (properties.tableLight._set.value = true))
  );

  instances.wallswitchTop.up(() =>
    allOffOr(() => (properties.ceilingLight._set.value = true))
  );
})();

export const diningRoom = {
  ...groups,
  ...properties,
  devices,
};

metadataStore.set(diningRoom, {
  level: Levels.ROOM,
  name: 'diningRoom',
});
