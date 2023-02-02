/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
import { logger } from '../logging.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { persistence } from '../persistence.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'bedroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 724720),
  wallswitchDoor: shellyi3(
    logger,
    persistence,
    timings,
    'bedroom-wallswitchdoor.lan.wurstsalat.cloud'
  ),
  windowSensorLeft: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    762272
  ),
};

export const instances = {
  wallswitchBed: devices.ceilingLight.button.$,
  wallswitchDoorLeft: devices.wallswitchDoor.button0.$,
  wallswitchDoorMiddle: devices.wallswitchDoor.button1.$,
  wallswitchDoorRight: devices.wallswitchDoor.button2.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  door: addMeta({ open: devices.doorSensor.open }, { level: Levels.AREA }),
  windowLeft: addMeta(
    { open: devices.windowSensorLeft.open },
    { level: Levels.AREA, name: 'window' }
  ),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight]),
  allWindows: inputGrouping(properties.windowLeft.open._get),
};

(() => {
  instances.wallswitchBed.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchBed.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoorLeft.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchDoorLeft.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoorMiddle.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoorRight.up(() => properties.ceilingLight._set.flip());
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
