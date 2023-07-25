/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { epochs } from '../../../lib/epochs.js';
import {
  ev1527ButtonX1,
  ev1527ButtonX4,
} from '../../../lib/tree/devices/ev1527-button.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { roomSensor } from '../../../lib/tree/devices/room-sensor.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Element, Level } from '../../../lib/tree/main.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import {
  door,
  inputGrouping,
  window,
} from '../../../lib/tree/properties/sensors.js';
import { logger } from '../../logging.js';
import { persistence } from '../../persistence.js';
import { timings } from '../../timings.js';
import { ev1527Transport } from '../../tree/bridges.js';

export const devices = {
  button: ev1527ButtonX1(ev1527Transport, 74_160, logger),
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'mrpelzbedroom-ceilinglight.lan.wurstsalat.cloud',
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 724_720),
  floodLight: obiPlug(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'mrpelzbedroom-floodlight.lan.wurstsalat.cloud',
  ),
  multiButton: ev1527ButtonX4(ev1527Transport, 831_834, logger),
  nightLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'mrpelzbedroom-nightlight.lan.wurstsalat.cloud',
  ),
  roomSensor: roomSensor(
    logger,
    persistence,
    timings,
    'test-room-sensor.lan.wurstsalat.cloud',
  ),
  wallswitchDoor: shellyi3(
    logger,
    persistence,
    timings,
    'mrpelzbedroom-wallswitchdoor.lan.wurstsalat.cloud',
  ),
  windowSensorLeft: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    762_272,
  ),
};

export const instances = {
  button: devices.button.props.state,
  floodlightButton: devices.floodLight.props.button.props.state,
  multiButton: devices.multiButton.props.state,
  nightLightButton: devices.nightLight.props.button.props.state,
  wallswitchBed: devices.ceilingLight.props.button.props.state,
  wallswitchDoorLeft: devices.wallswitchDoor.props.button0.props.state,
  wallswitchDoorMiddle: devices.wallswitchDoor.props.button1.props.state,
  wallswitchDoorRight: devices.wallswitchDoor.props.button2.props.state,
};

export const properties = {
  brightness: devices.roomSensor.props.internal.brightness,
  ceilingLight: devices.ceilingLight.props.internal.relay,
  door: door(devices.doorSensor),
  floodLight: devices.floodLight.props.internal.relay,
  floodLightTimer: offTimer(epochs.hour, undefined, [
    'mrpelz-bedroom/floodLightTimer',
    persistence,
  ]),
  humidity: devices.roomSensor.props.internal.humidity,
  nightLight: devices.nightLight.props.internal.relay,
  pressure: devices.roomSensor.props.internal.pressure,
  temperature: devices.roomSensor.props.internal.temperature,
  tvoc: devices.roomSensor.props.internal.tvoc,
  windowLeft: window(devices.windowSensorLeft),
};

export const groups = {
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.floodLight,
    properties.nightLight,
  ]),
  allWindows: inputGrouping(
    properties.windowLeft.props.open.props.main.props.state,
  ),
};

(() => {
  instances.button.observe(() => {
    if (groups.allLights.props.main.props.setState.value) {
      groups.allLights.props.main.props.setState.value = false;
      return;
    }

    properties.nightLight.props.main.props.setState.value = true;
  });

  instances.floodlightButton.up(() =>
    properties.floodLight.props.flip.props.setState.trigger(),
  );
  instances.floodlightButton.longPress(
    () => (groups.allLights.props.main.props.setState.value = false),
  );

  instances.multiButton.topLeft.observe(() =>
    properties.ceilingLight.props.flip.props.setState.trigger(),
  );
  instances.multiButton.topRight.observe(() =>
    properties.floodLight.props.flip.props.setState.trigger(),
  );
  instances.multiButton.bottomLeft.observe(() =>
    properties.nightLight.props.flip.props.setState.trigger(),
  );
  instances.multiButton.bottomRight.observe(() =>
    groups.allLights.props.flip.props.setState.trigger(),
  );

  instances.nightLightButton.up(() =>
    properties.nightLight.props.flip.props.setState.trigger(),
  );
  instances.nightLightButton.longPress(
    () => (groups.allLights.props.main.props.setState.value = false),
  );

  instances.wallswitchBed.up(() =>
    properties.ceilingLight.props.flip.props.setState.trigger(),
  );
  instances.wallswitchBed.longPress(
    () => (groups.allLights.props.main.props.setState.value = false),
  );

  instances.wallswitchDoorLeft.up(() =>
    properties.nightLight.props.flip.props.setState.trigger(),
  );
  instances.wallswitchDoorLeft.longPress(
    () => (groups.allLights.props.main.props.setState.value = false),
  );

  instances.wallswitchDoorMiddle.up(() =>
    properties.ceilingLight.props.flip.props.setState.trigger(),
  );
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.allLights.props.main.props.setState.value = false),
  );

  instances.wallswitchDoorRight.up(() =>
    properties.floodLight.props.flip.props.setState.trigger(),
  );
  instances.wallswitchDoorRight.longPress(
    () => (groups.allLights.props.main.props.setState.value = false),
  );

  properties.floodLight.props.main.props.setState.observe((value) => {
    properties.floodLightTimer.props.active.props.state.value = value;
  }, true);

  properties.floodLightTimer.props.state.observe(() => {
    properties.floodLight.props.main.props.setState.value = false;
  });
})();

export const mrpelzBedroom = new Element({
  $: 'mrpelzBedroom' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
