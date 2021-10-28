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
  deviceCeilingLight: sonoffBasic(
    logger,
    timings,
    'diningroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  deviceCouchButton: ev1527ButtonX1(ev1527Transport, 374680, logger),
  deviceFan: obiPlug(logger, timings, 'diningroom-fan.iot.wurstsalat.cloud'),
  deviceFanRfButton: ev1527ButtonX1(ev1527Transport, 307536, logger),
  deviceKallaxLeds: h801(
    logger,
    timings,
    'diningroom-kallaxleds.iot.wurstsalat.cloud'
  ),
  deviceKallaxSideButton: ev1527ButtonX1(ev1527Transport, 992584, logger),
  deviceStandingLamp: obiPlug(
    logger,
    timings,
    'diningroom-standinglamp.iot.wurstsalat.cloud'
  ),
  deviceTableLight: sonoffBasic(
    logger,
    timings,
    'diningroom-tablelight.iot.wurstsalat.cloud'
  ),
  deviceWallswitch: shellyi3(
    logger,
    timings,
    'diningroom-wallswitch.iot.wurstsalat.cloud'
  ),
};

export const instances = {
  couchButton: devices.deviceCouchButton.$,
  fanButton: devices.deviceFan.button.$,
  fanRfButton: devices.deviceFanRfButton.$,
  kallaxSideButton: devices.deviceKallaxSideButton.$,
  standingLampButton: devices.deviceStandingLamp.button.$,
  wallswitchBottom: devices.deviceWallswitch.button1.$,
  wallswitchTop: devices.deviceWallswitch.button0.$,
};

export const properties = {
  ceilingLight: devices.deviceCeilingLight.relay,
  fan: devices.deviceFan.relay,
  kallaxLedB: devices.deviceKallaxLeds.ledB,
  kallaxLedG: devices.deviceKallaxLeds.ledG,
  kallaxLedR: devices.deviceKallaxLeds.ledR,
  kallaxLedSide: devices.deviceKallaxLeds.ledW2,
  kallaxLedW: devices.deviceKallaxLeds.ledW1,
  standingLamp: devices.deviceStandingLamp.relay,
  tableLight: devices.deviceTableLight.relay,
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
  ...devices,
  ...groups,
  ...properties,
};

metadataStore.set(diningRoom, {
  level: Levels.ROOM,
  name: 'diningRoom',
});
