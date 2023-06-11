/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../../lib/tree/main.js';
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
  standingLampButton: devices.standingLamp.button.instance,
  wallswitchLeft: devices.wallswitch.button0.instance,
  wallswitchMiddle: devices.wallswitch.button1.instance,
  wallswitchRight: devices.wallswitch.button2.instance,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  door: element({
    open: devices.doorSensor.open,
    [symbolLevel]: Level.AREA,
  }),
  standingLamp: devices.standingLamp.relay,
  windowRight: element({
    open: devices.windowSensorRight.open,
    [symbolLevel]: Level.AREA,
  }),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
  allWindows: inputGrouping(properties.windowRight.open.main.instance),
};

(() => {
  instances.standingLampButton.up(() =>
    properties.standingLamp.flip.instance.trigger()
  );
  instances.standingLampButton.longPress(
    () => (groups.allLights.main.setState.value = false)
  );

  instances.wallswitchLeft.up(() =>
    properties.ceilingLight.flip.instance.trigger()
  );
  instances.wallswitchLeft.longPress(
    () => (groups.allLights.main.setState.value = false)
  );

  instances.wallswitchMiddle.up(() =>
    properties.standingLamp.flip.instance.trigger()
  );
  instances.wallswitchMiddle.longPress(
    () => (groups.allLights.main.setState.value = false)
  );

  instances.wallswitchRight.up(() =>
    properties.ceilingLight.flip.instance.trigger()
  );
  instances.wallswitchRight.longPress(
    () => (groups.allLights.main.setState.value = false)
  );
})();

export const tsiaBedroom = element({
  devices: element({ ...devices, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
