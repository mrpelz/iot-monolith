/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { logger } from '../logging.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: shelly1(
    logger,
    timings,
    'bathtubbathroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, ev1527Transport, 721216),
  nightLight: sonoffBasic(
    logger,
    timings,
    'bathtubbathroom-nightlight.iot.wurstsalat.cloud'
  ),
  wallswitchMirror: shellyi3(
    logger,
    timings,
    'bathtubbathroom-wallswitchmirror.iot.wurstsalat.cloud'
  ),
};

export const instances = {
  nightLightButton: devices.nightLight.button.$,
  wallswitchDoor: devices.ceilingLight.button.$,
  wallswitchMirror: devices.wallswitchMirror.button0.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  doorOpen: devices.doorSensor.open,
  doorSensorTampered: devices.doorSensor.tamperSwitch,
  nightLight: devices.nightLight.relay,
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.nightLight]),
};

(() => {
  instances.nightLightButton.up(() => properties.nightLight._set.flip());
  instances.nightLightButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoor.up(() => {
    if (!devices.ceilingLight.online._get.value) {
      properties.nightLight._set.flip();
      return;
    }

    properties.ceilingLight._set.flip();
  });
  instances.wallswitchDoor.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchMirror.up(() => properties.nightLight._set.flip());
  instances.wallswitchMirror.longPress(
    () => (groups.allLights._set.value = false)
  );

  properties.doorOpen._get.observe((value) => {
    if (!value) return;

    if (!devices.ceilingLight.online._get.value) {
      properties.nightLight._set.value = true;
      return;
    }

    properties.nightLight._set.value = false;
    properties.ceilingLight._set.value = true;
  });
})();

export const bathtubBathroom = {
  ...groups,
  ...properties,
  devices,
};

metadataStore.set(bathtubBathroom, {
  level: Levels.ROOM,
  name: 'bathtubBathroom',
});