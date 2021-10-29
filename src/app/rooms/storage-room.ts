/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import { ackBlinkFromOff, ackBlinkFromOn } from '../orchestrations.js';
import { ev1527Transport, rfBridge } from '../bridges.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { logger } from '../logging.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: shelly1(
    logger,
    timings,
    'storage-ceilinglight.iot.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, ev1527Transport, 55632),
  rfBridge,
};

export const instances = {
  wallswitch: devices.ceilingLight.button.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  doorOpen: devices.doorSensor.open,
  doorSensorTampered: devices.doorSensor.tamperSwitch,
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight]),
  timedCeilingLight: outputGrouping(
    [properties.ceilingLight],
    undefined,
    epochs.minute * 5
  ),
};

(() => {
  const timerEnabled = groups.timedCeilingLight.offTimer?.$;
  const timerActive = groups.timedCeilingLight.offTimer?.active.$;

  instances.wallswitch.up(() => groups.timedCeilingLight._set.flip());

  instances.wallswitch.longPress(() => {
    if (!timerEnabled) return;

    groups.timedCeilingLight._set.value = true;

    if (timerActive) {
      timerActive.value = false;
    }

    if (properties.ceilingLight._set.value) {
      ackBlinkFromOn(properties.ceilingLight.effectState.$);
    } else {
      ackBlinkFromOff(properties.ceilingLight.effectState.$);
    }
  });

  properties.doorOpen._get.observe((value) => {
    if (!value) return;
    groups.timedCeilingLight._set.value = true;
  });
})();

export const storageRoom = {
  ...groups,
  ...properties,
  devices,
};

metadataStore.set(storageRoom, {
  level: Levels.ROOM,
  name: 'storageRoom',
});
