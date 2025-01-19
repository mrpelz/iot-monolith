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
import { Level } from '../../../lib/tree/main.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import {
  door,
  inputGrouping,
  window,
} from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { persistence } from '../../persistence.js';
import { ev1527Transport } from '../bridges.js';

export const devices = {
  button: ev1527ButtonX1(74_160, ev1527Transport, context),
  ceilingLight: shelly1(
    'lighting' as const,
    'mrpelzbedroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  doorSensor: ev1527WindowSensor(724_720, ev1527Transport, context),
  floodLight: obiPlug(
    'lighting' as const,
    'mrpelzbedroom-floodlight.lan.wurstsalat.cloud',
    context,
  ),
  multiButton: ev1527ButtonX4(831_834, ev1527Transport, context),
  nightLight: sonoffBasic(
    'lighting' as const,
    'mrpelzbedroom-nightlight.lan.wurstsalat.cloud',
    context,
  ),
  roomSensor: roomSensor('test-room-sensor.lan.wurstsalat.cloud', context),
  wallswitchDoor: shellyi3(
    'mrpelzbedroom-wallswitchdoor.lan.wurstsalat.cloud',
    context,
  ),
  windowSensorLeft: ev1527WindowSensor(762_272, ev1527Transport, context),
};

export const instances = {
  button: devices.button.state,
  floodlightButton: devices.floodLight.button.state,
  multiButton: devices.multiButton.state,
  nightLightButton: devices.nightLight.button.state,
  wallswitchBed: devices.ceilingLight.button.state,
  wallswitchDoorLeft: devices.wallswitchDoor.button0.state,
  wallswitchDoorMiddle: devices.wallswitchDoor.button1.state,
  wallswitchDoorRight: devices.wallswitchDoor.button2.state,
};

export const properties = {
  brightness: devices.roomSensor.internal.brightness,
  ceilingLight: devices.ceilingLight.internal.relay,
  door: door(devices.doorSensor),
  floodLight: devices.floodLight.internal.relay,
  floodLightTimer: offTimer(epochs.hour, undefined, [
    'mrpelz-bedroom/floodLightTimer',
    persistence,
  ]),
  humidity: devices.roomSensor.internal.humidity,
  nightLight: devices.nightLight.internal.relay,
  pressure: devices.roomSensor.internal.pressure,
  temperature: devices.roomSensor.internal.temperature,
  tvoc: devices.roomSensor.internal.tvoc,
  windowLeft: window(devices.windowSensorLeft),
};

export const groups = {
  allLights: outputGrouping([
    properties.ceilingLight,
    properties.floodLight,
    properties.nightLight,
  ]),
  allWindows: inputGrouping(properties.windowLeft.open.main.state),
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
    properties.floodLight.flip.setState.trigger(),
  );
  instances.floodlightButton.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.multiButton.topLeft.observe(() =>
    properties.ceilingLight.flip.setState.trigger(),
  );
  instances.multiButton.topRight.observe(() =>
    properties.floodLight.flip.setState.trigger(),
  );
  instances.multiButton.bottomLeft.observe(() =>
    properties.nightLight.flip.setState.trigger(),
  );
  instances.multiButton.bottomRight.observe(() =>
    groups.allLights.flip.setState.trigger(),
  );

  instances.nightLightButton.up(() =>
    properties.nightLight.flip.setState.trigger(),
  );
  instances.nightLightButton.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchBed.up(() =>
    properties.ceilingLight.flip.setState.trigger(),
  );
  instances.wallswitchBed.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchDoorLeft.up(() =>
    properties.nightLight.flip.setState.trigger(),
  );
  instances.wallswitchDoorLeft.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchDoorMiddle.up(() =>
    properties.ceilingLight.flip.setState.trigger(),
  );
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchDoorRight.up(() =>
    properties.floodLight.flip.setState.trigger(),
  );
  instances.wallswitchDoorRight.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  properties.floodLight.main.setState.observe((value) => {
    properties.floodLightTimer.active.state.value = value;
  }, true);

  properties.floodLightTimer.state.observe(() => {
    properties.floodLight.main.setState.value = false;
  });
})();

export const mrpelzBedroom = {
  $: 'mrpelzBedroom' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
};
