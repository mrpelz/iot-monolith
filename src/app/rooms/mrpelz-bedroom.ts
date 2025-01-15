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
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../lib/tree/devices/h801.js';
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { persistence } from '../persistence.js';
import { roomSensor } from '../../lib/tree/devices/room-sensor.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  bookshelfLeds: h801(
    logger,
    persistence,
    timings,
    'bedroom-bedrgbwleds.lan.wurstsalat.cloud'
  ),
  button: ev1527ButtonX1(ev1527Transport, 74160, logger),
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'mrpelzbedroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 724720),
  multiButton: ev1527ButtonX4(ev1527Transport, 831834, logger),
  nightLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'mrpelzbedroom-nightlight.lan.wurstsalat.cloud'
  ),
  nightstandLeds: h801(
    logger,
    persistence,
    timings,
    'bedroom-nightstandleds.lan.wurstsalat.cloud'
  ),
  roomSensor: roomSensor(
    logger,
    persistence,
    timings,
    'test-room-sensor.lan.wurstsalat.cloud'
  ),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'livingroom-fan.lan.wurstsalat.cloud'
  ),
  wallswitchDoor: shellyi3(
    logger,
    persistence,
    timings,
    'mrpelzbedroom-wallswitchdoor.lan.wurstsalat.cloud'
  ),
  windowSensorLeft: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    762272
  ),
};

export const instances = {
  button: devices.button.$,
  multiButton: devices.multiButton.$,
  nightLightButton: devices.nightLight.button.$,
  standingLampButton: devices.standingLamp.button.$,
  wallswitchBed: devices.ceilingLight.button.$,
  wallswitchDoorLeft: devices.wallswitchDoor.button0.$,
  wallswitchDoorMiddle: devices.wallswitchDoor.button1.$,
  wallswitchDoorRight: devices.wallswitchDoor.button2.$,
};

export const properties = {
  bookshelfLedDown: devices.bookshelfLeds.ledG,
  bookshelfLedUpRed: devices.bookshelfLeds.ledG,
  bookshelfLedUpWWhite: devices.bookshelfLeds.ledR,
  brightness: devices.roomSensor.brightness,
  ceilingLight: devices.ceilingLight.relay,
  door: addMeta({ open: devices.doorSensor.open }, { level: Levels.AREA }),
  humidity: devices.roomSensor.humidity,
  nightLight: devices.nightLight.relay,
  nightstandLeftLedRed: devices.nightstandLeds.ledG,
  nightstandLeftLedWWhite: devices.nightstandLeds.ledR,
  nightstandRightLedRed: devices.nightstandLeds.ledW2,
  nightstandRightLedWWhite: devices.nightstandLeds.ledW1,
  pressure: devices.roomSensor.pressure,
  standingLamp: devices.standingLamp.relay,
  temperature: devices.roomSensor.temperature,
  tvoc: devices.roomSensor.tvoc,
  windowLeft: addMeta(
    { open: devices.windowSensorLeft.open },
    { level: Levels.AREA, name: 'window' }
  ),
};

export const groups = {
  allLights: outputGrouping([
    properties.bookshelfLedDown,
    properties.bookshelfLedUpRed,
    properties.bookshelfLedUpWWhite,
    properties.ceilingLight,
    properties.nightLight,
    properties.nightstandLeftLedRed,
    properties.nightstandLeftLedWWhite,
    properties.nightstandRightLedRed,
    properties.nightstandRightLedWWhite,
    properties.standingLamp,
  ]),
  allWindows: inputGrouping(properties.windowLeft.open._get),
  bookshelfLedWWhite: ledGrouping([
    properties.bookshelfLedDown,
    properties.bookshelfLedUpWWhite,
  ]),
  nightstandLedRed: ledGrouping([
    properties.nightstandLeftLedWWhite,
    properties.nightstandRightLedWWhite,
  ]),
  nightstandLedWWhite: ledGrouping([
    properties.nightstandLeftLedRed,
    properties.nightstandRightLedRed,
  ]),
};

(() => {
  instances.button.observe(() => {
    if (groups.allLights._set.value) {
      groups.allLights._set.value = false;
      return;
    }

    properties.nightLight._set.value = true;
  });

  instances.multiButton.topLeft.observe(() =>
    properties.ceilingLight._set.flip()
  );
  instances.multiButton.topRight.observe(() => groups.allLights._set.flip());
  instances.multiButton.bottomLeft.observe(() =>
    properties.nightLight._set.flip()
  );
  instances.multiButton.bottomRight.observe(() =>
    groups.bookshelfLedWWhite._set.flip()
  );

  instances.nightLightButton.up(() => properties.nightLight._set.flip());
  instances.nightLightButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.standingLampButton.up(() => properties.standingLamp._set.flip());
  instances.standingLampButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchBed.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchBed.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoorLeft.up(() => properties.nightLight._set.flip());
  instances.wallswitchDoorLeft.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoorMiddle.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoorRight.up(() => groups.allLights._set.flip());
  instances.wallswitchDoorRight.longPress(
    () => (groups.allLights._set.value = false)
  );
})();

export const mrpelzBedroom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    isDaylit: true,
    level: Levels.ROOM,
    name: 'mrpelzBedroom',
  }
);
