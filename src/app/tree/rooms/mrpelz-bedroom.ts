import { led, output } from '../../../lib/hap/actuators.js';
import { doorOrWindow } from '../../../lib/hap/sensors.js';
import {
  ev1527ButtonX1,
  ev1527ButtonX4,
} from '../../../lib/tree/devices/ev1527-button.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { roomSensor } from '../../../lib/tree/devices/room-sensor.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import {
  ledGrouping,
  outputGrouping,
} from '../../../lib/tree/properties/actuators.js';
import {
  door,
  inputGrouping,
  window,
} from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { hap } from '../../hap.js';
import { ev1527Transport } from '../bridges.js';

export const devices = {
  bookshelfLeds: h801('bedroom-bedrgbwleds.lan.wurstsalat.cloud', context),
  button: ev1527ButtonX1(74_160, ev1527Transport, context),
  ceilingLight: shelly1(
    'lighting',
    'mrpelzbedroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  doorSensor: ev1527WindowSensor(724_720, ev1527Transport, context),
  multiButton: ev1527ButtonX4(831_834, ev1527Transport, context),
  nightLight: sonoffBasic(
    'lighting',
    'mrpelzbedroom-nightlight.lan.wurstsalat.cloud',
    context,
  ),
  nightstandLeds: h801('bedroom-nightstandleds.lan.wurstsalat.cloud', context),
  roomSensor: roomSensor('test-room-sensor.lan.wurstsalat.cloud', context),
  standingLamp: obiPlug(
    'lighting',
    'livingroom-fan.lan.wurstsalat.cloud',
    context,
  ),
  wallswitchDoor: shellyi3(
    'mrpelzbedroom-wallswitchdoor.lan.wurstsalat.cloud',
    context,
  ),
  windowSensorLeft: ev1527WindowSensor(762_272, ev1527Transport, context),
};

export const instances = {
  button: devices.button.state,
  multiButton: devices.multiButton.state,
  nightLightButton: devices.nightLight.button.state,
  standingLampButton: devices.standingLamp.button.state,
  wallswitchBed: devices.ceilingLight.button.state,
  wallswitchDoorLeft: devices.wallswitchDoor.button0.state,
  wallswitchDoorMiddle: devices.wallswitchDoor.button1.state,
  wallswitchDoorRight: devices.wallswitchDoor.button2.state,
};

export const properties = {
  bookshelfLedDown: devices.bookshelfLeds.internal.ledB,
  bookshelfLedUpRed: devices.bookshelfLeds.internal.ledG,
  bookshelfLedUpWWhite: devices.bookshelfLeds.internal.ledR,
  brightness: devices.roomSensor.internal.brightness,
  ceilingLight: devices.ceilingLight.internal.relay,
  door: door(devices.doorSensor),
  humidity: devices.roomSensor.internal.humidity,
  nightLight: devices.nightLight.internal.relay,
  nightstandLeftLedRed: devices.nightstandLeds.internal.ledG,
  nightstandLeftLedWWhite: devices.nightstandLeds.internal.ledR,
  nightstandRightLedRed: devices.nightstandLeds.internal.ledW2,
  nightstandRightLedWWhite: devices.nightstandLeds.internal.ledW1,
  pressure: devices.roomSensor.internal.pressure,
  standingLamp: devices.standingLamp.internal.relay,
  temperature: devices.roomSensor.internal.temperature,
  tvoc: devices.roomSensor.internal.tvoc,
  windowLeft: window(devices.windowSensorLeft),
};

export const groups = {
  allLights: outputGrouping([
    properties.bookshelfLedDown,
    properties.bookshelfLedUpRed,
    properties.bookshelfLedUpWWhite,
    properties.ceilingLight,
    properties.nightLight,
    properties.nightstandLeftLedRed,
    properties.nightstandLeftLedWWhite,
    properties.nightstandRightLedRed,
    properties.nightstandRightLedWWhite,
    properties.standingLamp,
  ]),
  allWindows: inputGrouping(properties.windowLeft.open.main.state),
  bookshelfLedWWhite: ledGrouping([
    properties.bookshelfLedDown,
    properties.bookshelfLedUpWWhite,
  ]),
  nightstandLedRed: ledGrouping([
    properties.nightstandLeftLedRed,
    properties.nightstandRightLedRed,
  ]),
  nightstandLedWWhite: ledGrouping([
    properties.nightstandLeftLedWWhite,
    properties.nightstandRightLedWWhite,
  ]),
};

(() => {
  instances.button.observe(() => {
    if (groups.allLights.main.setState.value) {
      groups.allLights.main.setState.value = false;
      return;
    }

    properties.nightLight.main.setState.value = true;
  });

  instances.multiButton.topLeft.observe(() =>
    properties.ceilingLight.flip.setState.trigger(),
  );
  instances.multiButton.topRight.observe(() =>
    groups.allLights.flip.setState.trigger(),
  );
  instances.multiButton.bottomLeft.observe(() =>
    properties.nightLight.flip.setState.trigger(),
  );
  instances.multiButton.bottomRight.observe(() =>
    groups.bookshelfLedWWhite.flip.setState.trigger(),
  );

  instances.nightLightButton.up(() =>
    properties.nightLight.flip.setState.trigger(),
  );
  instances.nightLightButton.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.standingLampButton.up(() =>
    properties.standingLamp.flip.setState.trigger(),
  );
  instances.standingLampButton.longPress(
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
    groups.allLights.flip.setState.trigger(),
  );
  instances.wallswitchDoorRight.longPress(
    () => (groups.allLights.main.setState.value = false),
  );
})();

export const mrpelzBedroom = {
  $: 'mrpelzBedroom' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
};

hap.addAccessories(
  {
    displayName: 'mrpelz’s Bedroom Ceiling Light',
    id: `${mrpelzBedroom.$}.ceilingLight`,
    services: [
      output('ceilingLight', 'Ceiling Light', properties.ceilingLight),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Night Light',
    id: `${mrpelzBedroom.$}.nightLight`,
    services: [output('nightLight', 'Night Light', properties.nightLight)],
  },
  {
    displayName: 'mrpelz’s Bedroom Standing Lamp',
    id: `${mrpelzBedroom.$}.standingLamp`,
    services: [
      output('standingLamp', 'Standing Lamp', properties.standingLamp),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom All Lights',
    id: `${mrpelzBedroom.$}.allLights`,
    services: [output('allLights', 'All Lights', groups.allLights)],
  },
  {
    displayName: 'mrpelz’s Bedroom Bookshelf LEDs Warm White',
    id: `${mrpelzBedroom.$}.bookshelfLedWWhite`,
    services: [
      led(
        'bookshelfLedWWhite',
        'Bookshelf LEDs Warm White',
        groups.bookshelfLedWWhite,
      ),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Nightstand LEDs Red',
    id: `${mrpelzBedroom.$}.nightstandLedRed`,
    services: [
      led('nightstandLedRed', 'Nightstand LEDs Red', groups.nightstandLedRed),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Nightstand LEDs Warm White',
    id: `${mrpelzBedroom.$}.nightstandLedWWhite`,
    services: [
      led(
        'nightstandLedWWhite',
        'Nightstand LEDs Warm White',
        groups.nightstandLedWWhite,
      ),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Door',
    id: `${mrpelzBedroom.$}.door`,
    services: [doorOrWindow('door', 'Door', properties.door)],
  },
  {
    displayName: 'mrpelz’s Bedroom Window Left',
    id: `${mrpelzBedroom.$}.windowLeft`,
    services: [
      doorOrWindow('windowLeft', 'Window Left', properties.windowLeft),
    ],
  },
);
