/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import {
  ledGrouping,
  outputGrouping,
} from '../../lib/tree/properties/actuators.js';
import { Timer } from '../../lib/timer.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../lib/tree/devices/h801.js';
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
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
    'office-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    55696,
    'doorOpen'
  ),
  floodlight: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'office-floodlight.lan.wurstsalat.cloud'
  ),
  wallswitch: shellyi3(
    logger,
    timings,
    'office-wallswitch.lan.wurstsalat.cloud'
  ),
  // windowSensorLeft: ev1527WindowSensor(logger, ev1527Transport, 0),
  windowSensorRight: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    839280
  ),
  workbenchButton: ev1527ButtonX1(ev1527Transport, 903326, logger),
  workbenchLeds: h801(
    logger,
    persistence,
    timings,
    'office-workbenchleds.lan.wurstsalat.cloud'
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
  door: devices.doorSensor.open,
  floodLight: devices.floodlight.relay,
  floodLightTimer: offTimer(epochs.hour, undefined, [
    'office/floodLightTimer',
    persistence,
  ]),
  // windowLeft: devices.windowSensorLeft.open,
  // windowLeftSensorTampered: devices.windowSensorLeft.tamperSwitch,
  windowRight: devices.windowSensorRight.open,
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
  allWindows: inputGrouping([properties.windowRight._get], 'windowOpen'),
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

  const timer = new Timer(epochs.second * 5);

  instances.workbenchButton.observe(() => {
    const timerRunning = timer.isRunning;

    timer.start();

    if (!timerRunning && groups.workbenchLeds._get.value) {
      groups.workbenchLeds._set.value = false;
      return;
    }

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

  properties.floodLight._set.observe((value) => {
    properties.floodLightTimer.active.$.value = value;
  }, true);

  properties.floodLightTimer.$.observe(() => {
    properties.floodLight._set.value = false;
  });
})();

export const office = {
  devices,
  ...groups,
  ...properties,
};

metadataStore.set(office, {
  isDaylit: true,
  level: Levels.ROOM,
  name: 'office',
});
