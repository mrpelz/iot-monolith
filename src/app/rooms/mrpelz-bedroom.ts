/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, element, symbolLevel } from '../../lib/tree/main.js';
import {
  SceneMember,
  ledGrouping,
  outputGrouping,
  scene,
} from '../../lib/tree/properties/actuators.js';
import {
  ev1527ButtonX1,
  ev1527ButtonX4,
} from '../../lib/tree/devices/ev1527-button.js';
import { EnumState } from '../../lib/state.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../lib/tree/devices/h801.js';
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/tree/devices/obi-plug.js';
import { persistence } from '../persistence.js';
import { roomSensor } from '../../lib/tree/devices/room-sensor.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  bookshelfLeds: h801(
    logger,
    persistence,
    timings,
    'bedroom-bedrgbwleds.lan.wurstsalat.cloud'
  ),
  button: ev1527ButtonX1(ev1527Transport, 74160, logger),
  ceilingLight: shelly1(
    logger,
    persistence,
    timings,
    'lighting',
    'mrpelzbedroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 724720),
  heatLamp: sonoffBasic(
    logger,
    persistence,
    timings,
    'heating',
    'diningroom-ceilinglight.lan.wurstsalat.cloud'
  ),
  ionGenerator: sonoffBasic(
    logger,
    persistence,
    timings,
    'heating',
    'diningroom-tablelight.lan.wurstsalat.cloud'
  ),
  multiButton: ev1527ButtonX4(ev1527Transport, 831834, logger),
  nightLight: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'bedroom-stonelamp.lan.wurstsalat.cloud'
  ),
  nightstandLeds: h801(
    logger,
    persistence,
    timings,
    'bedroom-nightstandleds.lan.wurstsalat.cloud'
  ),
  roomSensor: roomSensor(
    logger,
    persistence,
    timings,
    'test-room-sensor.lan.wurstsalat.cloud'
  ),
  standingLamp: obiPlug(
    logger,
    persistence,
    timings,
    'lighting',
    'livingroom-fan.lan.wurstsalat.cloud'
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
  bookshelfLedDown: devices.bookshelfLeds.ledB,
  bookshelfLedUpRed: devices.bookshelfLeds.ledG,
  bookshelfLedUpWWhite: devices.bookshelfLeds.ledR,
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
  ionGenerator: devices.ionGenerator.relay,
  nightLight: devices.nightLight.relay,
  nightstandLeftLedRed: devices.nightstandLeds.ledG,
  nightstandLeftLedWWhite: devices.nightstandLeds.ledR,
  nightstandRightLedRed: devices.nightstandLeds.ledW2,
  nightstandRightLedWWhite: devices.nightstandLeds.ledW1,
  pressure: devices.roomSensor.pressure,
  standingLamp: devices.standingLamp.relay,
  temperature: devices.roomSensor.temperature,
  tvoc: devices.roomSensor.tvoc,
  windowLeft: element({
    open: devices.windowSensorLeft.open,
    [symbolLevel]: Level.AREA,
  }),
};

export const groups = {
  all: outputGrouping([
    properties.bookshelfLedDown,
    properties.bookshelfLedUpRed,
    properties.bookshelfLedUpWWhite,
    properties.ceilingLight,
    properties.heatLamp,
    properties.ionGenerator,
    properties.nightLight,
    properties.nightstandLeftLedRed,
    properties.nightstandLeftLedWWhite,
    properties.nightstandRightLedRed,
    properties.nightstandRightLedWWhite,
    properties.standingLamp,
  ]),
  allLights: outputGrouping([
    properties.bookshelfLedDown,
    properties.bookshelfLedUpRed,
    properties.bookshelfLedUpWWhite,
    properties.ceilingLight,
    properties.heatLamp,
    properties.nightLight,
    properties.nightstandLeftLedRed,
    properties.nightstandLeftLedWWhite,
    properties.nightstandRightLedRed,
    properties.nightstandRightLedWWhite,
    properties.standingLamp,
  ]),
  allWindows: inputGrouping(properties.windowLeft.open.main.instance),
};

const scenes = {
  allOff: scene(
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness._set, 0),
      new SceneMember(properties.nightstandLeftLedRed.brightness._set, 0),
      new SceneMember(properties.nightstandRightLedRed.brightness._set, 0),
      new SceneMember(properties.nightLight._set, false),
      new SceneMember(properties.bookshelfLedUpWWhite.brightness._set, 0),
      new SceneMember(properties.standingLamp._set, false),
      new SceneMember(properties.bookshelfLedDown.brightness._set, 0),
      new SceneMember(properties.nightstandLeftLedWWhite.brightness._set, 0),
      new SceneMember(properties.nightstandRightLedWWhite.brightness._set, 0),
      new SceneMember(properties.ceilingLight._set, false),
    ],
    'light'
  ),
  allRed: scene(
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness._set, 1, 0),
      new SceneMember(properties.nightstandLeftLedRed.brightness._set, 1, 0),
      new SceneMember(properties.nightstandRightLedRed.brightness._set, 1, 0),
      new SceneMember(properties.nightLight._set, false),
      new SceneMember(properties.bookshelfLedUpWWhite.brightness._set, 0),
      new SceneMember(properties.standingLamp._set, false),
      new SceneMember(properties.bookshelfLedDown.brightness._set, 0),
      new SceneMember(properties.nightstandLeftLedWWhite.brightness._set, 0),
      new SceneMember(properties.nightstandRightLedWWhite.brightness._set, 0),
      new SceneMember(properties.ceilingLight._set, false),
    ],
    'light'
  ),
  onlyNightLight: scene(
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness._set, 0),
      new SceneMember(properties.nightstandLeftLedRed.brightness._set, 0),
      new SceneMember(properties.nightstandRightLedRed.brightness._set, 0),
      new SceneMember(properties.nightLight._set, true, false),
      new SceneMember(properties.bookshelfLedUpWWhite.brightness._set, 0),
      new SceneMember(properties.standingLamp._set, false),
      new SceneMember(properties.bookshelfLedDown.brightness._set, 0),
      new SceneMember(properties.nightstandLeftLedWWhite.brightness._set, 0),
      new SceneMember(properties.nightstandRightLedWWhite.brightness._set, 0),
      new SceneMember(properties.ceilingLight._set, false),
    ],
    'light'
  ),
  // eslint-disable-next-line sort-keys
  moodLight: scene(
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness._set, 1, 0),
      new SceneMember(properties.nightstandLeftLedRed.brightness._set, 0),
      new SceneMember(properties.nightstandRightLedRed.brightness._set, 0),
      new SceneMember(properties.nightLight._set, true, false),
      new SceneMember(properties.bookshelfLedUpWWhite.brightness._set, 0.5, 0),
      new SceneMember(properties.standingLamp._set, true, false),
      new SceneMember(properties.bookshelfLedDown.brightness._set, 0),
      new SceneMember(properties.nightstandLeftLedWWhite.brightness._set, 0),
      new SceneMember(properties.nightstandRightLedWWhite.brightness._set, 0),
      new SceneMember(properties.ceilingLight._set, false),
    ],
    'light'
  ),
  // eslint-disable-next-line sort-keys
  ceilingLightPlus: scene(
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness._set, 0),
      new SceneMember(properties.nightstandLeftLedRed.brightness._set, 0),
      new SceneMember(properties.nightstandRightLedRed.brightness._set, 0),
      new SceneMember(properties.nightLight._set, false),
      new SceneMember(properties.bookshelfLedUpWWhite.brightness._set, 1, 0),
      new SceneMember(properties.standingLamp._set, true, false),
      new SceneMember(properties.bookshelfLedDown.brightness._set, 1, 0),
      new SceneMember(properties.nightstandLeftLedWWhite.brightness._set, 1, 0),
      new SceneMember(
        properties.nightstandRightLedWWhite.brightness._set,
        1,
        0
      ),
      new SceneMember(properties.ceilingLight._set, true, false),
    ],
    'light'
  ),
  everythingOn: scene(
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness._set, 1, 0),
      new SceneMember(properties.nightstandLeftLedRed.brightness._set, 1, 0),
      new SceneMember(properties.nightstandRightLedRed.brightness._set, 1, 0),
      new SceneMember(properties.nightLight._set, true, false),
      new SceneMember(properties.bookshelfLedUpWWhite.brightness._set, 1, 0),
      new SceneMember(properties.standingLamp._set, true, false),
      new SceneMember(properties.bookshelfLedDown.brightness._set, 1, 0),
      new SceneMember(properties.nightstandLeftLedWWhite.brightness._set, 1, 0),
      new SceneMember(
        properties.nightstandRightLedWWhite.brightness._set,
        1,
        0
      ),
      new SceneMember(properties.ceilingLight._set, true, false),
    ],
    'light'
  ),
};

const sceneCycle = new EnumState(
  [
    scenes.allOff,
    scenes.allRed,
    scenes.onlyNightLight,
    scenes.moodLight,
    scenes.ceilingLightPlus,
    scenes.everythingOn,
  ] as const,
  scenes.allOff
);

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
  instances.wallswitchDoorLeft.longPress(() => (groups.all._set.value = false));

  instances.wallswitchDoorMiddle.up(() => {
    if (groups.allLights._set.value) {
      groups.allLights._set.value = false;
      return;
    }

    scenes.moodLight._set.value = true;
  });
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.all._set.value = false)
  );

  instances.wallswitchDoorRight.up(() => {
    if (!groups.allLights._set.value) {
      scenes.ceilingLightPlus._set.value = true;
      return;
    }

    sceneCycle.next();
  });
  instances.wallswitchDoorRight.longPress(
    () => (groups.all._set.value = false)
  );

  sceneCycle.observe((value) => (value._set.value = true));

  for (const aScene of Object.values(scenes)) {
    aScene._get.observe((value) => {
      if (!value) return;
      sceneCycle.value = aScene;
    });
  }
})();

export const mrpelzBedroom = element({
  devices: element({ ...devices, [symbolLevel]: Level.NONE }),
  ...groups,
  ...properties,
  [symbolLevel]: Level.ROOM,
});
