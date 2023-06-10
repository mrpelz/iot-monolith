/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../../lib/tree/main-ng.js';
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
  wallswitch: devices.ceilingLight.button.instance,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  door: element({
    open: devices.doorSensor.open,
    [symbolLevel]: Level.AREA,
  }),
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

  instances.wallswitch.up(() =>
    properties.ceilingLight.flip.instance.trigger()
  );

  instances.wallswitch.longPress(async () => {
    if (!properties.lightTimer.main.instance.value) return;

    indicatorInProgress = true;

    if (properties.ceilingLight.main.setState.value) {
      await ackBlinkFromOn(properties.ceilingLight.main.setState);
    } else {
      await ackBlinkFromOff(properties.ceilingLight.main.setState);
    }

    indicatorInProgress = false;

    // eslint-disable-next-line require-atomic-updates
    properties.lightTimer.active.instance.value = false;
  });

  properties.door.open.main.instance.observe((value) => {
    if (!value) return;
    properties.ceilingLight.main.setState.value = true;
  });

  properties.ceilingLight.main.setState.observe((value) => {
    if (indicatorInProgress) return;

    properties.lightTimer.active.instance.value = value;
  }, true);

  properties.lightTimer.instance.observe(() => {
    properties.ceilingLight.main.setState.value = false;
  });
})();

export const storageRoom = element({
  devices: element({ ...devices, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
