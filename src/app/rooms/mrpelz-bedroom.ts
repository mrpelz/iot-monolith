/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, addMeta } from '../../lib/tree/main.js';
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
  button: devices.button.$.i,
  floodlightButton: devices.floodLight.button.$,
  multiButton: devices.multiButton.$.i,
  nightLightButton: devices.nightLight.button.$,
  standingLampButton: devices.standingLamp.button.$,
  wallswitchBed: devices.ceilingLight.button.$,
  wallswitchDoorLeft: devices.wallswitchDoor.button0.$,
  wallswitchDoorMiddle: devices.wallswitchDoor.button1.$,
  wallswitchDoorRight: devices.wallswitchDoor.button2.$,
};

export const properties = {
  bookshelfLedDown: devices.bookshelfLeds.ledB,
  bookshelfLedUpRed: devices.bookshelfLeds.ledG,
  bookshelfLedUpWWhite: devices.bookshelfLeds.ledR,
  brightness: devices.roomSensor.brightness,
  ceilingLight: devices.ceilingLight.relay,
  door: addMeta({ open: devices.doorSensor.open }, { level: Levels.AREA }),
  heatLamp: devices.heatLamp.relay,
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
  windowLeft: addMeta(
    { open: devices.windowSensorLeft.open },
    { level: Levels.AREA, name: 'window' }
  ),
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
  allWindows: inputGrouping(properties.windowLeft.open._get),
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
  redLeds: ledGrouping([
    properties.bookshelfLedUpRed,
    properties.nightstandLeftLedRed,
    properties.nightstandRightLedRed,
  ]),
  wWhiteLeds: ledGrouping([
    properties.bookshelfLedDown,
    properties.bookshelfLedUpWWhite,
    properties.nightstandLeftLedWWhite,
    properties.nightstandRightLedWWhite,
  ]),
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
  const offOrElse = (fn: () => void) => () => {
    if (groups.allLights._set.value) {
      groups.allLights._set.value = false;
      return;
    }

    fn();
  };
  instances.button.observe(
    offOrElse(() => (scenes.onlyNightLight._set.value = true))
  );

  instances.multiButton.topLeft.observe(
    offOrElse(() => (scenes.moodLight._set.value = true))
  );
  instances.multiButton.topRight.observe(
    offOrElse(() => (scenes.ceilingLightPlus._set.value = true))
  );
  instances.multiButton.bottomLeft.observe(() => sceneCycle.previous());
  instances.multiButton.bottomRight.observe(() => sceneCycle.next());

  instances.heatLampButton.up(() => properties.heatLamp._set.flip());
  instances.heatLampButton.longPress(() => (groups.all._set.value = false));

  instances.ionGeneratorButton.up(() => properties.ionGenerator._set.flip());
  instances.ionGeneratorButton.longPress(() => (groups.all._set.value = false));

  instances.nightLightButton.up(() => properties.nightLight._set.flip());
  instances.nightLightButton.longPress(() => (groups.all._set.value = false));

  instances.standingLampButton.up(() => properties.standingLamp._set.flip());
  instances.standingLampButton.longPress(() => (groups.all._set.value = false));

  instances.wallswitchBed.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchBed.longPress(() => (groups.all._set.value = false));

  instances.wallswitchDoorLeft.up(() => {
    if (!groups.allLights._set.value) {
      scenes.onlyNightLight._set.value = true;
      return;
    }

  instances.wallswitchDoorMiddle.up(() => properties.ceilingLight._set.flip());
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.allLights._set.value = false)
  );

  instances.wallswitchDoorRight.up(() => properties.floodLight._set.flip());
  instances.wallswitchDoorRight.longPress(
    () => (groups.allLights._set.value = false)
  );

  properties.floodLight._set.observe((value) => {
    properties.floodLightTimer.active.$.value = value;
  }, true);

  properties.floodLightTimer.$.i.observe(() => {
    properties.floodLight._set.value = false;
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

export const mrpelzBedroom = addMeta(
  {
    devices,
    ...groups,
    ...properties,
    ...scenes,
  },
  {
    isDaylit: true,
    level: Levels.ROOM,
    name: 'mrpelzBedroom',
  }
);
