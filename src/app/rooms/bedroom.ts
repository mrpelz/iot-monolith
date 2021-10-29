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
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: shelly1(
    logger,
    timings,
    'bedroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  nightstandButtonLeft: ev1527ButtonX1(ev1527Transport, 74160, logger),
  nightstandButtonRight: ev1527ButtonX1(ev1527Transport, 4448, logger),
  nightstandLeds: h801(
    logger,
    timings,
    'bedroom-nightstandleds.iot.wurstsalat.cloud'
  ),
  rgbwLeds: h801(logger, timings, 'bedroom-bedrgbwleds.iot.wurstsalat.cloud'),
  stoneLamp: obiPlug(logger, timings, 'bedroom-stonelamp.iot.wurstsalat.cloud'),
  wallswitchDoor: shellyi3(
    logger,
    timings,
    'bedroom-wallswitchdoor.iot.wurstsalat.cloud'
  ),
};

export const instances = {
  nightstandButtonLeft: devices.nightstandButtonLeft.$,
  nightstandButtonRight: devices.nightstandButtonRight.$,
  stoneLampButton: devices.stoneLamp.button.$,
  wallswitchBedButton: devices.ceilingLight.button.$,
  wallswitchDoorButtonLeft: devices.wallswitchDoor.button0.$,
  wallswitchDoorButtonMiddle: devices.wallswitchDoor.button1.$,
  wallswitchDoorButtonRight: devices.wallswitchDoor.button2.$,
};

export const properties = {
  bedLedB: devices.rgbwLeds.ledB,
  bedLedDownlightRed: devices.nightstandLeds.ledB,
  bedLedG: devices.rgbwLeds.ledG,
  bedLedR: devices.rgbwLeds.ledR,
  bedLedW: devices.rgbwLeds.ledW1,
  ceilingLight: devices.ceilingLight.relay,
  nightstandLedLeft: devices.nightstandLeds.ledR,
  nightstandLedRight: devices.nightstandLeds.ledG,
  stoneLamp: devices.stoneLamp.relay,
};

export const groups = {
  allLights: outputGrouping([
    properties.bedLedR,
    properties.bedLedG,
    properties.bedLedB,
    properties.bedLedW,
    properties.ceilingLight,
    properties.nightstandLedLeft,
    properties.nightstandLedRight,
    properties.bedLedDownlightRed,
    properties.stoneLamp,
  ]),
  fuckLight: outputGrouping([
    properties.bedLedDownlightRed,
    properties.bedLedR,
    properties.stoneLamp,
  ]),
  leds: ledGrouping([
    properties.bedLedR,
    properties.bedLedG,
    properties.bedLedB,
    properties.bedLedW,
    properties.nightstandLedLeft,
    properties.nightstandLedRight,
    properties.bedLedDownlightRed,
  ]),
  nightstandLeds: ledGrouping([
    properties.nightstandLedLeft,
    properties.nightstandLedRight,
  ]),
  whiteLeds: ledGrouping([
    properties.bedLedW,
    properties.nightstandLedLeft,
    properties.nightstandLedRight,
  ]),
};

(() => {
  const allOffOr = (cb: () => void) => {
    if (groups.allLights._get.value) {
      groups.allLights._set.value = false;

      return;
    }

    cb();
  };

  instances.nightstandButtonLeft.observe(() =>
    allOffOr(() => (properties.nightstandLedLeft._set.value = true))
  );

  instances.nightstandButtonRight.observe(() =>
    allOffOr(() => (properties.nightstandLedRight._set.value = true))
  );

  instances.wallswitchBedButton.up(() =>
    allOffOr(() => (properties.ceilingLight._set.value = true))
  );

  instances.stoneLampButton.up(() =>
    allOffOr(() => (properties.stoneLamp._set.value = true))
  );

  instances.wallswitchDoorButtonLeft.up(() =>
    allOffOr(() => (groups.whiteLeds._set.value = true))
  );
  instances.wallswitchDoorButtonMiddle.up(() =>
    allOffOr(() => (properties.ceilingLight._set.value = true))
  );
  instances.wallswitchDoorButtonRight.up(() =>
    allOffOr(() => (groups.fuckLight._set.value = true))
  );
})();

export const bedroom = {
  ...groups,
  ...properties,
  devices,
};

metadataStore.set(bedroom, {
  isDaylit: true,
  level: Levels.ROOM,
  name: 'bedroom',
});
