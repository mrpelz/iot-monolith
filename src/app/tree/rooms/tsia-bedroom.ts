/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Element, Level } from '../../../lib/tree/main.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
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
  ceilingLight: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'tsiabedroom-ceilinglight.lan.wurstsalat.cloud',
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 55_696),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'tsiabedroom-standinglamp.lan.wurstsalat.cloud',
  ),
  wallswitch: shellyi3(
    logger,
    persistence,
    timings,
    'tsiabedroom-wallswitch.lan.wurstsalat.cloud',
  ),
  windowSensorRight: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    839_280,
  ),
};

export const instances = {
  standingLampButton: devices.standingLamp.props.button.props.state,
  wallswitchLeft: devices.wallswitch.props.button0.props.state,
  wallswitchMiddle: devices.wallswitch.props.button1.props.state,
  wallswitchRight: devices.wallswitch.props.button2.props.state,
};

export const properties = {
  ceilingLight: devices.ceilingLight.props.internal.relay,
  door: door(devices.doorSensor),
  standingLamp: devices.standingLamp.props.internal.relay,
  windowRight: window(devices.windowSensorRight),
};

export const groups = {
  allLights: outputGrouping([properties.ceilingLight, properties.standingLamp]),
  allWindows: inputGrouping(
    properties.windowRight.props.open.props.main.props.state,
  ),
};

(() => {
  instances.standingLampButton.up(() =>
    properties.standingLamp.props.flip.props.setState.trigger(),
  );
  instances.standingLampButton.longPress(
    () => (groups.allLights.props.main.props.setState.value = false),
  );

  instances.wallswitchLeft.up(() =>
    properties.ceilingLight.props.flip.props.setState.trigger(),
  );
  instances.wallswitchLeft.longPress(
    () => (groups.allLights.props.main.props.setState.value = false),
  );

  instances.wallswitchMiddle.up(() =>
    properties.standingLamp.props.flip.props.setState.trigger(),
  );
  instances.wallswitchMiddle.longPress(
    () => (groups.allLights.props.main.props.setState.value = false),
  );

  instances.wallswitchRight.up(() =>
    properties.ceilingLight.props.flip.props.setState.trigger(),
  );
  instances.wallswitchRight.longPress(
    () => (groups.allLights.props.main.props.setState.value = false),
  );
})();

export const tsiaBedroom = new Element({
  $: 'tsiaBedroom' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});