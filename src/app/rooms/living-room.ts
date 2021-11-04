/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { groups as systemGroups } from '../system.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLight: sonoffBasic(
    logger,
    timings,
    'livingroom-ceilinglight.iot.wurstsalat.cloud'
  ),
  fan: obiPlug(logger, timings, 'livingroom-fan.iot.wurstsalat.cloud'),
  standingLamp: obiPlug(
    logger,
    timings,
    'livingroom-standinglamp.iot.wurstsalat.cloud'
  ),
  wallswitch: shellyi3(
    logger,
    timings,
    'livingroom-wallswitch.iot.wurstsalat.cloud'
  ),
  windowSensor: ev1527WindowSensor(logger, ev1527Transport, 670496),
};

export const instances = {
  fanButton: devices.fan.button.$,
  standingLampButton: devices.standingLamp.button.$,
  wallswitchBottom: devices.wallswitch.button2.$,
  wallswitchMiddle: devices.wallswitch.button1.$,
  wallswitchTop: devices.wallswitch.button0.$,
  windowOpen: devices.windowSensor.open,
  windowSensorTampered: devices.windowSensor.tamperSwitch,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  fan: devices.fan.relay,
  standingLamp: devices.standingLamp.relay,
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
};

(() => {
  instances.fanButton.up(() => properties.fan._set.flip());

  instances.standingLampButton.up(() => properties.standingLamp._set.flip());
  instances.standingLampButton.longPress(
    () => (systemGroups.kitchenAdjacentLights._set.value = false)
  );

  instances.wallswitchBottom.up(() => properties.fan._set.flip());
  instances.wallswitchBottom.longPress(
    () => (systemGroups.kitchenAdjacentLights._set.value = false)
  );

  instances.wallswitchMiddle.up(() => properties.standingLamp._set.flip());
  instances.wallswitchMiddle.longPress(
    () => (systemGroups.kitchenAdjacentLights._set.value = false)
  );

  instances.wallswitchTop.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchTop.longPress(
    () => (systemGroups.kitchenAdjacentLights._set.value = false)
  );
})();

export const livingRoom = {
  ...groups,
  ...properties,
  devices,
};

metadataStore.set(livingRoom, {
  isDaylit: true,
  level: Levels.ROOM,
  name: 'livingRoom',
});
