/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import { Timer } from '../../lib/timer.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { logger } from '../logging.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
// import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: shelly1(
    logger,
    timings,
    'showerbathroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, ev1527Transport, 720256),
  // mirrorLight: sonoffBasic(
  //   logger,
  //   timings,
  //   'showerbathroom-mirrorlight.iot.wurstsalat.cloud'
  // ),
  // nightLight: sonoffBasic(
  //   logger,
  //   timings,
  //   'showerbathroom-nightlight.iot.wurstsalat.cloud'
  // ),
  showerButton: ev1527ButtonX1(ev1527Transport, 628217, logger),
  wallswitchDoor: shellyi3(
    logger,
    timings,
    'showerbathroom-wallswitchdoor.iot.wurstsalat.cloud'
  ),
};

export const instances = {
  // mirrorLightButton: devices.mirrorLight.button.$,
  // nightLightButton: devices.nightLight.button.$,
  showerButton: devices.showerButton.$,
  wallswitchDoor: devices.wallswitchDoor.button0.$,
  wallswitchMirrorBottom: devices.wallswitchDoor.button2.$,
  wallswitchMirrorTop: devices.wallswitchDoor.button1.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  doorOpen: devices.doorSensor.open,
  doorSensorTampered: devices.doorSensor.tamperSwitch,
  // mirrorLight: devices.mirrorLight.relay,
  // nightLight: devices.nightLight.relay,
};

export const groups = {
  allLights: outputGrouping([
    properties.ceilingLight,
    // properties.mirrorLight,
    // properties.nightLight,
  ]),
};

(() => {
  // instances.mirrorLightButton.up(() => properties.mirrorLight._set.flip());
  // instances.mirrorLightButton.longPress(
  //   () => (groups.allLights._set.value = false)
  // );

  // instances.nightLightButton.up(() => properties.nightLight._set.flip());
  // instances.nightLightButton.longPress(
  //   () => (groups.allLights._set.value = false)
  // );

  const timer = new Timer(epochs.second * 5);

  instances.showerButton.observe(() => {
    if (!timer.isRunning && groups.allLights._get.value) {
      groups.allLights._set.value = false;
      timer.start();
      return;
    }

    if (!groups.allLights._get.value) {
      // properties.nightLight._set.value = true;
      return;
    }

    // if (properties.nightLight._get.value) {
    //   properties.nightLight._set.value = false;
    //   properties.mirrorLight._set.value = true;
    //   return;
    // }

    // if (properties.mirrorLight._get.value) {
    //   properties.mirrorLight._set.value = false;
    //   properties.ceilingLight._set.value = true;
    //   return;
    // }

    if (properties.ceilingLight._get.value) {
      groups.allLights._set.value = true;
      return;
    }

    if (groups.allLights._get.value) {
      groups.allLights._set.value = false;
    }
  });

  instances.wallswitchDoor.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchDoor.longPress(
    () => (groups.allLights._set.value = false)
  );

  // instances.wallswitchMirrorTop.up(() => properties.mirrorLight._set.flip());
  instances.wallswitchMirrorTop.longPress(
    () => (groups.allLights._set.value = false)
  );

  // instances.wallswitchMirrorBottom.up(() => properties.nightLight._set.flip());
  instances.wallswitchMirrorBottom.longPress(
    () => (groups.allLights._set.value = false)
  );

  properties.doorOpen._get.observe((value) => {
    if (!value) return;
    properties.ceilingLight._set.value = true;
  });
})();

export const showerBathroom = {
  ...groups,
  ...properties,
  devices,
};

metadataStore.set(showerBathroom, {
  level: Levels.ROOM,
  name: 'showerBathroom',
});
