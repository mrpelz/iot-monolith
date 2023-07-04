/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level } from '../../lib/tree/main.js';
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
  brightness: devices.roomSensor.props.brightness,
  ceilingLight: devices.ceilingLight.props.relay,
  door: new Element({
    level: Level.AREA as const,
    open: devices.doorSensor.props.open,
  }),
  floodLight: devices.floodLight.props.relay,
  floodLightTimer: offTimer(epochs.hour, undefined, [
    'mrpelz-bedroom/floodLightTimer',
    persistence,
  ]),
  humidity: devices.roomSensor.props.humidity,
  nightLight: devices.nightLight.props.relay,
  pressure: devices.roomSensor.props.pressure,
  temperature: devices.roomSensor.props.temperature,
  tvoc: devices.roomSensor.props.tvoc,
  windowLeft: new Element({
    level: Level.AREA as const,
    open: devices.windowSensorLeft.props.open,
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
  allWindows: inputGrouping(
    properties.windowLeft.props.open.props.main.props.state
  ),
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
    if (groups.allLights.props.main.props.setState.value) {
      groups.allLights.props.main.props.setState.value = false;
      return;
    }

    properties.nightLight.props.main.props.setState.value = true;
  });

  instances.floodlightButton.up(() =>
    properties.floodLight.props.flip.props.state.trigger()
  );
  instances.floodlightButton.longPress(
    () => (groups.allLights.props.main.props.setState.value = false)
  );

  instances.multiButton.topLeft.observe(() =>
    properties.ceilingLight.props.flip.props.state.trigger()
  );
  instances.multiButton.topRight.observe(() =>
    properties.floodLight.props.flip.props.state.trigger()
  );
  instances.multiButton.bottomLeft.observe(() =>
    properties.nightLight.props.flip.props.state.trigger()
  );
  instances.multiButton.bottomRight.observe(() =>
    groups.allLights.props.flip.props.state.trigger()
  );

  instances.nightLightButton.up(() =>
    properties.nightLight.props.flip.props.state.trigger()
  );
  instances.nightLightButton.longPress(
    () => (groups.allLights.props.main.props.setState.value = false)
  );

  instances.wallswitchBed.up(() =>
    properties.ceilingLight.props.flip.props.state.trigger()
  );
  instances.wallswitchBed.longPress(
    () => (groups.allLights.props.main.props.setState.value = false)
  );

  instances.wallswitchDoorLeft.up(() =>
    properties.nightLight.props.flip.props.state.trigger()
  );
  instances.wallswitchDoorLeft.longPress(
    () => (groups.allLights.props.main.props.setState.value = false)
  );

  instances.wallswitchDoorMiddle.up(() =>
    properties.ceilingLight.props.flip.props.state.trigger()
  );
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.allLights.props.main.props.setState.value = false)
  );

  instances.wallswitchDoorRight.up(() =>
    properties.floodLight.props.flip.props.state.trigger()
  );
  instances.wallswitchDoorRight.longPress(
    () => (groups.allLights.props.main.props.setState.value = false)
  );

  properties.floodLight.props.main.props.setState.observe((value) => {
    properties.floodLightTimer.props.active.props.state.value = value;
  }, true);

  properties.floodLightTimer.props.state.observe(() => {
    properties.floodLight.props.main.props.setState.value = false;
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

export const mrpelzBedroom = new Element({
  devices: new Element({ ...devices, level: Level.NONE as const }),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
