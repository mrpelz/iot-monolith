/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
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
    'tsiabedroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 55696),
  fan: obiPlug(
    logger,
    persistence,
    timings,
    'fan',
    'tsiabedroom-fan.lan.wurstsalat.cloud'
  ),
  fanButton: ev1527ButtonX1(ev1527Transport, 898570, logger),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'tsiabedroom-standinglamp.lan.wurstsalat.cloud'
  ),
  wallswitch: shellyi3(
    logger,
    persistence,
    timings,
    'tsiabedroom-wallswitch.lan.wurstsalat.cloud'
  ),
  windowSensorRight: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    839280
  ),
};

export const instances = {
  fanButton: devices.fan.button.$,
  fanRfButton: devices.fanButton.$,
  standingLampButton: devices.standingLamp.button.$,
  wallswitchLeft: devices.wallswitch.button0.$,
  wallswitchMiddle: devices.wallswitch.button1.$,
  wallswitchRight: devices.wallswitch.button2.$,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  door: addMeta({ open: devices.doorSensor.open }, { level: Levels.AREA }),
  fan: devices.fan.relay,
  standingLamp: devices.standingLamp.relay,
  windowRight: addMeta(
    { open: devices.windowSensorRight.open },
    { level: Levels.AREA, name: 'window' }
  ),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
  allWindows: inputGrouping(properties.windowRight.open._get),
};

(() => {
  instances.fanButton.up(() => properties.fan._set.flip());
  instances.fanRfButton.observe(() => properties.fan._set.flip());

  instances.standingLampButton.up(() => properties.standingLamp._set.flip());
  instances.standingLampButton.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchLeft.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchLeft.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchMiddle.up(() => properties.standingLamp._set.flip());
  instances.wallswitchMiddle.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchRight.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchRight.longPress(
    () => (groups.allLights._set.value = false)
  );
})();

export const tsiaBedroom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    isDaylit: true,
    level: Levels.ROOM,
    name: 'tsiaBedroom',
  }
);
