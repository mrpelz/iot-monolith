import { EnumState } from '../../../lib/state.js';
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
  scene,
  SceneMember,
} from '../../../lib/tree/properties/actuators.js';
import {
  door,
  inputGrouping,
  window,
} from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
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
  heatLamp: sonoffBasic(
    'heating',
    'diningroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  ionGenerator: sonoffBasic(
    'heating',
    'diningroom-tablelight.lan.wurstsalat.cloud',
    context,
  ),
  multiButton: ev1527ButtonX4(831_834, ev1527Transport, context),
  nightLight: sonoffBasic(
    'lighting',
    'bedroom-stonelamp.lan.wurstsalat.cloud',
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
  windowSensorRight: ev1527WindowSensor(247_072, ev1527Transport, context),
};

export const instances = {
  button: devices.button.state,
  heatLampButton: devices.heatLamp.button.state,
  ionGeneratorButton: devices.ionGenerator.button.state,
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
  door: door(context, devices.doorSensor, undefined),
  heatLamp: devices.heatLamp.internal.relay,
  humidity: devices.roomSensor.internal.humidity,
  ionGenerator: devices.ionGenerator.internal.relay,
  nightLight: devices.nightLight.internal.relay,
  nightstandLeftLedRed: devices.nightstandLeds.internal.ledG,
  nightstandLeftLedWWhite: devices.nightstandLeds.internal.ledR,
  nightstandRightLedRed: devices.nightstandLeds.internal.ledW2,
  nightstandRightLedWWhite: devices.nightstandLeds.internal.ledW1,
  pressure: devices.roomSensor.internal.pressure,
  standingLamp: devices.standingLamp.internal.relay,
  temperature: devices.roomSensor.internal.temperature,
  tvoc: devices.roomSensor.internal.tvoc,
  windowLeft: window(context, devices.windowSensorLeft, 'security'),
  windowRight: window(context, devices.windowSensorRight, 'security'),
};

export const groups = {
  allLights: outputGrouping(
    context,
    [
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
    ],
    'lighting',
  ),
  allThings: outputGrouping(
    context,
    [
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
    ],
    undefined,
  ),
  allWindows: inputGrouping(
    context,
    [properties.windowLeft, properties.windowRight],
    'security',
  ),
  bookshelfLedWWhite: ledGrouping(context, [
    properties.bookshelfLedDown,
    properties.bookshelfLedUpWWhite,
  ]),
  nightstandLedRed: ledGrouping(context, [
    properties.nightstandLeftLedRed,
    properties.nightstandRightLedRed,
  ]),
  nightstandLedWWhite: ledGrouping(context, [
    properties.nightstandLeftLedWWhite,
    properties.nightstandRightLedWWhite,
  ]),
  redLeds: ledGrouping(context, [
    properties.bookshelfLedUpRed,
    properties.nightstandLeftLedRed,
    properties.nightstandRightLedRed,
  ]),
  wWhiteLeds: ledGrouping(context, [
    properties.bookshelfLedDown,
    properties.bookshelfLedUpWWhite,
    properties.nightstandLeftLedWWhite,
    properties.nightstandRightLedWWhite,
  ]),
};

const scenes = {
  allOff: scene(
    context,
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness.setState, 0),
      new SceneMember(properties.nightstandLeftLedRed.brightness.setState, 0),
      new SceneMember(properties.nightstandRightLedRed.brightness.setState, 0),
      new SceneMember(properties.nightLight.main.setState, false),
      new SceneMember(properties.bookshelfLedUpWWhite.brightness.setState, 0),
      new SceneMember(properties.standingLamp.main.setState, false),
      new SceneMember(properties.bookshelfLedDown.brightness.setState, 0),
      new SceneMember(
        properties.nightstandLeftLedWWhite.brightness.setState,
        0,
      ),
      new SceneMember(
        properties.nightstandRightLedWWhite.brightness.setState,
        0,
      ),
      new SceneMember(properties.ceilingLight.main.setState, false),
    ],
    'light',
  ),
  allRed: scene(
    context,
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness.setState, 1, 0),
      new SceneMember(
        properties.nightstandLeftLedRed.brightness.setState,
        1,
        0,
      ),
      new SceneMember(
        properties.nightstandRightLedRed.brightness.setState,
        1,
        0,
      ),
      new SceneMember(properties.nightLight.main.setState, false),
      new SceneMember(properties.bookshelfLedUpWWhite.brightness.setState, 0),
      new SceneMember(properties.standingLamp.main.setState, false),
      new SceneMember(properties.bookshelfLedDown.brightness.setState, 0),
      new SceneMember(
        properties.nightstandLeftLedWWhite.brightness.setState,
        0,
      ),
      new SceneMember(
        properties.nightstandRightLedWWhite.brightness.setState,
        0,
      ),
      new SceneMember(properties.ceilingLight.main.setState, false),
    ],
    'light',
  ),
  onlyNightLight: scene(
    context,
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness.setState, 0),
      new SceneMember(properties.nightstandLeftLedRed.brightness.setState, 0),
      new SceneMember(properties.nightstandRightLedRed.brightness.setState, 0),
      new SceneMember(properties.nightLight.main.setState, true, false),
      new SceneMember(properties.bookshelfLedUpWWhite.brightness.setState, 0),
      new SceneMember(properties.standingLamp.main.setState, false),
      new SceneMember(properties.bookshelfLedDown.brightness.setState, 0),
      new SceneMember(
        properties.nightstandLeftLedWWhite.brightness.setState,
        0,
      ),
      new SceneMember(
        properties.nightstandRightLedWWhite.brightness.setState,
        0,
      ),
      new SceneMember(properties.ceilingLight.main.setState, false),
    ],
    'light',
  ),
  // eslint-disable-next-line sort-keys
  moodLight: scene(
    context,
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness.setState, 1, 0),
      new SceneMember(properties.nightstandLeftLedRed.brightness.setState, 0),
      new SceneMember(properties.nightstandRightLedRed.brightness.setState, 0),
      new SceneMember(properties.nightLight.main.setState, true, false),
      new SceneMember(
        properties.bookshelfLedUpWWhite.brightness.setState,
        0.5,
        0,
      ),
      new SceneMember(properties.standingLamp.main.setState, true, false),
      new SceneMember(properties.bookshelfLedDown.brightness.setState, 0),
      new SceneMember(
        properties.nightstandLeftLedWWhite.brightness.setState,
        0,
      ),
      new SceneMember(
        properties.nightstandRightLedWWhite.brightness.setState,
        0,
      ),
      new SceneMember(properties.ceilingLight.main.setState, false),
    ],
    'light',
  ),
  // eslint-disable-next-line sort-keys
  ceilingLightPlus: scene(
    context,
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness.setState, 0),
      new SceneMember(properties.nightstandLeftLedRed.brightness.setState, 0),
      new SceneMember(properties.nightstandRightLedRed.brightness.setState, 0),
      new SceneMember(properties.nightLight.main.setState, false),
      new SceneMember(
        properties.bookshelfLedUpWWhite.brightness.setState,
        1,
        0,
      ),
      new SceneMember(properties.standingLamp.main.setState, true, false),
      new SceneMember(properties.bookshelfLedDown.brightness.setState, 1, 0),
      new SceneMember(
        properties.nightstandLeftLedWWhite.brightness.setState,
        1,
        0,
      ),
      new SceneMember(
        properties.nightstandRightLedWWhite.brightness.setState,
        1,
        0,
      ),
      new SceneMember(properties.ceilingLight.main.setState, true, false),
    ],
    'light',
  ),
  everythingOn: scene(
    context,
    [
      new SceneMember(properties.bookshelfLedUpRed.brightness.setState, 1, 0),
      new SceneMember(
        properties.nightstandLeftLedRed.brightness.setState,
        1,
        0,
      ),
      new SceneMember(
        properties.nightstandRightLedRed.brightness.setState,
        1,
        0,
      ),
      new SceneMember(properties.nightLight.main.setState, true, false),
      new SceneMember(
        properties.bookshelfLedUpWWhite.brightness.setState,
        1,
        0,
      ),
      new SceneMember(properties.standingLamp.main.setState, true, false),
      new SceneMember(properties.bookshelfLedDown.brightness.setState, 1, 0),
      new SceneMember(
        properties.nightstandLeftLedWWhite.brightness.setState,
        1,
        0,
      ),
      new SceneMember(
        properties.nightstandRightLedWWhite.brightness.setState,
        1,
        0,
      ),
      new SceneMember(properties.ceilingLight.main.setState, true, false),
    ],
    'light',
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
  scenes.allOff,
);

(() => {
  const offOrElse = (fn: () => void) => () => {
    if (groups.allLights.main.setState.value) {
      groups.allLights.main.setState.value = false;
      return;
    }

    fn();
  };
  instances.button.observe(
    offOrElse(() => (scenes.onlyNightLight.main.setState.value = true)),
  );

  instances.multiButton.topLeft.observe(
    offOrElse(() => (scenes.moodLight.main.setState.value = true)),
  );
  instances.multiButton.topRight.observe(
    offOrElse(() => (scenes.ceilingLightPlus.main.setState.value = true)),
  );
  instances.multiButton.bottomLeft.observe(() => sceneCycle.previous());
  instances.multiButton.bottomRight.observe(() => sceneCycle.next());

  instances.heatLampButton.up(() =>
    properties.heatLamp.flip.setState.trigger(),
  );
  instances.heatLampButton.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.ionGeneratorButton.up(() =>
    properties.ionGenerator.flip.setState.trigger(),
  );
  instances.ionGeneratorButton.longPress(
    () => (groups.allLights.main.setState.value = false),
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

  instances.wallswitchDoorLeft.up(() => {
    if (!groups.allLights.main.setState.value) {
      scenes.onlyNightLight.main.setState.value = true;
      return;
    }

    sceneCycle.previous();
  });
  instances.wallswitchDoorLeft.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchDoorMiddle.up(() => {
    if (groups.allLights.main.setState.value) {
      groups.allLights.main.setState.value = false;
      return;
    }

    scenes.moodLight.main.setState.value = true;
  });
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  instances.wallswitchDoorRight.up(() => {
    if (!groups.allLights.main.setState.value) {
      scenes.ceilingLightPlus.main.setState.value = true;
      return;
    }

    sceneCycle.next();
  });
  instances.wallswitchDoorRight.longPress(
    () => (groups.allLights.main.setState.value = false),
  );

  sceneCycle.observe((value) => (value.main.setState.value = true));

  for (const aScene of Object.values(scenes)) {
    aScene.main.state.observe((value) => {
      if (!value) return;
      sceneCycle.value = aScene;
    });
  }
})();

export const mrpelzBedroom = {
  $: 'mrpelzBedroom' as const,
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  ...scenes,
};
