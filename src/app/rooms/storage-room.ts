/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import { ackBlinkFromOff, ackBlinkFromOn } from '../orchestrations.js';
import { ev1527Transport, rfBridge } from '../bridges.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { logger } from '../logging.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { persistence } from '../persistence.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'storage-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 55632),
  rfBridge,
};

export const instances = {
  wallswitch: devices.ceilingLight.button.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  door: addMeta({ open: devices.doorSensor.open }, { level: Levels.AREA }),
  lightTimer: offTimer(epochs.minute * 5, undefined, [
    'storageRoom/lightTimer',
    persistence,
  ]),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight]),
};

(() => {
  let indicatorInProgress = false;

  instances.wallswitch.up(() => properties.ceilingLight._set.flip());

  instances.wallswitch.longPress(async () => {
    if (!properties.lightTimer._get.value) return;

    indicatorInProgress = true;

    if (properties.ceilingLight._set.value) {
      await ackBlinkFromOn(properties.ceilingLight._set);
    } else {
      await ackBlinkFromOff(properties.ceilingLight._set);
    }

    indicatorInProgress = false;

    // eslint-disable-next-line require-atomic-updates
    properties.lightTimer.active.$.value = false;
  });

  properties.door.open._get.observe((value) => {
    if (!value) return;
    properties.ceilingLight._set.value = true;
  });

  properties.ceilingLight._set.observe((value) => {
    if (indicatorInProgress) return;

    properties.lightTimer.active.$.value = value;
  }, true);

  properties.lightTimer.$instance.observe(() => {
    properties.ceilingLight._set.value = false;
  });
})();

export const storageRoom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    level: Levels.ROOM,
    name: 'storageRoom',
  }
);
