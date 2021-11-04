/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import {
  ledGrouping,
  outputGrouping,
} from '../../lib/tree/properties/actuators.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
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
    'office-ceilinglight.iot.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, ev1527Transport, 55632),
  floodlight: obiPlug(
    logger,
    timings,
    'office-floodlight.iot.wurstsalat.cloud'
  ),
  wallswitch: shellyi3(
    logger,
    timings,
    'office-wallswitch.iot.wurstsalat.cloud'
  ),
  // windowSensorLeft: ev1527WindowSensor(logger, ev1527Transport, 0),
  windowSensorRight: ev1527WindowSensor(logger, ev1527Transport, 839280),
  workbenchButton: ev1527ButtonX1(ev1527Transport, 903326, logger),
  workbenchLeds: h801(
    logger,
    timings,
    'office-workbenchleds.iot.wurstsalat.cloud'
  ),
};

export const instances = {
  floodlightButton: devices.floodlight.button.$,
  wallswitchLeft: devices.wallswitch.button0.$,
  wallswitchMiddle: devices.wallswitch.button1.$,
  wallswitchRight: devices.wallswitch.button2.$,
  workbenchButton: devices.workbenchButton.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  doorOpen: devices.doorSensor.open,
  doorSensorTampered: devices.doorSensor.tamperSwitch,
  floodLight: devices.floodlight.relay,
  // windowLeftOpen: devices.windowSensorLeft.open,
  // windowLeftSensorTampered: devices.windowSensorLeft.tamperSwitch,
  windowRightOpen: devices.windowSensorRight.open,
  windowRightSensorTampered: devices.windowSensorRight.tamperSwitch,
  workbenchLedCWhite: devices.workbenchLeds.ledB,
  workbenchLedWWhite: devices.workbenchLeds.ledG,
};

export const groups = {
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.floodLight,
    properties.workbenchLedCWhite,
    properties.workbenchLedWWhite,
  ]),
  workbenchLeds: ledGrouping([
    properties.workbenchLedCWhite,
    properties.workbenchLedWWhite,
  ]),
};

(() => {
  instances.floodlightButton.up(() => properties.floodLight._set.flip());
  instances.floodlightButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchLeft.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchLeft.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchMiddle.up(() => properties.floodLight._set.flip());
  instances.wallswitchMiddle.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchRight.up(() => groups.workbenchLeds._set.flip());
  instances.wallswitchRight.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.workbenchButton.observe(() => {
    if (
      !properties.workbenchLedCWhite._get.value &&
      !properties.workbenchLedWWhite._get.value
    ) {
      groups.workbenchLeds._set.value = true;
      return;
    }

    if (
      properties.workbenchLedCWhite._get.value &&
      properties.workbenchLedWWhite._get.value
    ) {
      properties.workbenchLedCWhite._set.value = false;
      return;
    }

    if (
      !properties.workbenchLedCWhite._get.value &&
      properties.workbenchLedWWhite._get.value
    ) {
      properties.workbenchLedCWhite._set.value = true;
      properties.workbenchLedWWhite._set.value = false;
      return;
    }

    if (
      properties.workbenchLedCWhite._get.value &&
      !properties.workbenchLedWWhite._get.value
    ) {
      groups.workbenchLeds._set.value = false;
    }
  });
})();

export const office = {
  ...groups,
  ...properties,
  devices,
};

metadataStore.set(office, {
  level: Levels.ROOM,
  name: 'office',
});
