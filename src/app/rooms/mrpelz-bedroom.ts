/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../../lib/tree/main.js';
import {
  ev1527ButtonX1,
  ev1527ButtonX4,
} from '../../lib/tree/devices/ev1527-button.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { persistence } from '../persistence.js';
import { roomSensor } from '../../lib/tree/devices/room-sensor.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  button: ev1527ButtonX1(ev1527Transport, 74160, logger),
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'mrpelzbedroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 724720),
  floodLight: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'mrpelzbedroom-floodlight.lan.wurstsalat.cloud'
  ),
  multiButton: ev1527ButtonX4(ev1527Transport, 831834, logger),
  nightLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting',
    'mrpelzbedroom-nightlight.lan.wurstsalat.cloud'
  ),
  roomSensor: roomSensor(
    logger,
    persistence,
    timings,
    'test-room-sensor.lan.wurstsalat.cloud'
  ),
  wallswitchDoor: shellyi3(
    logger,
    persistence,
    timings,
    'mrpelzbedroom-wallswitchdoor.lan.wurstsalat.cloud'
  ),
  windowSensorLeft: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    762272
  ),
};

export const instances = {
  button: devices.button.instance,
  floodlightButton: devices.floodLight.button.instance,
  multiButton: devices.multiButton.instance,
  nightLightButton: devices.nightLight.button.instance,
  wallswitchBed: devices.ceilingLight.button.instance,
  wallswitchDoorLeft: devices.wallswitchDoor.button0.instance,
  wallswitchDoorMiddle: devices.wallswitchDoor.button1.instance,
  wallswitchDoorRight: devices.wallswitchDoor.button2.instance,
};

export const properties = {
  brightness: devices.roomSensor.brightness,
  ceilingLight: devices.ceilingLight.relay,
  door: element({
    open: devices.doorSensor.open,
    [symbolLevel]: Level.AREA,
  }),
  floodLight: devices.floodLight.relay,
  floodLightTimer: offTimer(epochs.hour, undefined, [
    'mrpelz-bedroom/floodLightTimer',
    persistence,
  ]),
  humidity: devices.roomSensor.humidity,
  nightLight: devices.nightLight.relay,
  pressure: devices.roomSensor.pressure,
  temperature: devices.roomSensor.temperature,
  tvoc: devices.roomSensor.tvoc,
  windowLeft: element({
    open: devices.windowSensorLeft.open,
    [symbolLevel]: Level.AREA,
  }),
};

export const groups = {
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.floodLight,
    properties.nightLight,
  ]),
  allWindows: inputGrouping(properties.windowLeft.open.main.instance),
};

(() => {
  instances.button.observe(() => {
    if (groups.allLights.main.setState.value) {
      groups.allLights.main.setState.value = false;
      return;
    }

    properties.nightLight.main.setState.value = true;
  });

  instances.floodlightButton.up(() =>
    properties.floodLight.flip.instance.trigger()
  );
  instances.floodlightButton.longPress(
    () => (groups.allLights.main.setState.value = false)
  );

  instances.multiButton.topLeft.observe(() =>
    properties.ceilingLight.flip.instance.trigger()
  );
  instances.multiButton.topRight.observe(() =>
    properties.floodLight.flip.instance.trigger()
  );
  instances.multiButton.bottomLeft.observe(() =>
    properties.nightLight.flip.instance.trigger()
  );
  instances.multiButton.bottomRight.observe(() =>
    groups.allLights.flip.instance.trigger()
  );

  instances.nightLightButton.up(() =>
    properties.nightLight.flip.instance.trigger()
  );
  instances.nightLightButton.longPress(
    () => (groups.allLights.main.setState.value = false)
  );

  instances.wallswitchBed.up(() =>
    properties.ceilingLight.flip.instance.trigger()
  );
  instances.wallswitchBed.longPress(
    () => (groups.allLights.main.setState.value = false)
  );

  instances.wallswitchDoorLeft.up(() =>
    properties.nightLight.flip.instance.trigger()
  );
  instances.wallswitchDoorLeft.longPress(
    () => (groups.allLights.main.setState.value = false)
  );

  instances.wallswitchDoorMiddle.up(() =>
    properties.ceilingLight.flip.instance.trigger()
  );
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.allLights.main.setState.value = false)
  );

  instances.wallswitchDoorRight.up(() =>
    properties.floodLight.flip.instance.trigger()
  );
  instances.wallswitchDoorRight.longPress(
    () => (groups.allLights.main.setState.value = false)
  );

  properties.floodLight.main.setState.observe((value) => {
    properties.floodLightTimer.active.instance.value = value;
  }, true);

  properties.floodLightTimer.instance.observe(() => {
    properties.floodLight.main.setState.value = false;
  });
})();

export const mrpelzBedroom = element({
  devices: element({ ...devices, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
