import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import {
  door,
  inputGrouping,
  window,
} from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { ev1527Transport } from '../bridges.js';

export const devices = {
  ceilingLight: sonoffBasic(
    'lighting' as const,
    'tsiabedroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  doorSensor: ev1527WindowSensor(55_696, ev1527Transport, context),
  standingLamp: obiPlug(
    'lighting' as const,
    'tsiabedroom-standinglamp.lan.wurstsalat.cloud',
    context,
  ),
  wallswitch: shellyi3('tsiabedroom-wallswitch.lan.wurstsalat.cloud', context),
  windowSensorRight: ev1527WindowSensor(839_280, ev1527Transport, context),
};

export const instances = {
  standingLampButton: devices.standingLamp.button.state,
  wallswitchLeft: devices.wallswitch.button0.state,
  wallswitchMiddle: devices.wallswitch.button1.state,
  wallswitchRight: devices.wallswitch.button2.state,
};

export const properties = {
  ceilingLight: devices.ceilingLight.internal.relay,
  door: door(devices.doorSensor),
  standingLamp: devices.standingLamp.internal.relay,
  windowRight: window(devices.windowSensorRight),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
  allWindows: inputGrouping(properties.windowRight.open.main.state),
};

(() => {
  instances.standingLampButton.up(() =>
    properties.standingLamp.flip.setState.trigger(),
  );
  instances.standingLampButton.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchLeft.up(() =>
    properties.ceilingLight.flip.setState.trigger(),
  );
  instances.wallswitchLeft.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchMiddle.up(() =>
    properties.standingLamp.flip.setState.trigger(),
  );
  instances.wallswitchMiddle.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchRight.up(() =>
    properties.ceilingLight.flip.setState.trigger(),
  );
  instances.wallswitchRight.longPress(
    () => (groups.allLights.main.setState.value = false),
  );
})();

export const tsiaBedroom = {
  $: 'tsiaBedroom' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
};
