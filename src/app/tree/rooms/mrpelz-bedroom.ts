import { makeCustomStringLogger } from '../../../lib/log.js';
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
import { flipMain, getMain, setMain } from '../../../lib/tree/logic.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
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
import { logger, logicReasoningLevel } from '../../logging.js';
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
  button: devices.button,
  heatLampButton: devices.heatLamp.internal.button,
  ionGeneratorButton: devices.ionGenerator.internal.button,
  multiButton: devices.multiButton,
  nightLightButton: devices.nightLight.internal.button,
  standingLampButton: devices.standingLamp.internal.button,
  wallswitchBed: devices.ceilingLight.internal.button,
  wallswitchDoorLeft: devices.wallswitchDoor.internal.button0,
  wallswitchDoorMiddle: devices.wallswitchDoor.internal.button1,
  wallswitchDoorRight: devices.wallswitchDoor.internal.button2,
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

const $init: InitFunction = (room, introspection) => {
  const { allLights } = groups;
  const {
    button,
    heatLampButton,
    ionGeneratorButton,
    multiButton,
    nightLightButton,
    standingLampButton,
    wallswitchBed,
    wallswitchDoorLeft,
    wallswitchDoorMiddle,
    wallswitchDoorRight,
  } = instances;
  const { ceilingLight, heatLamp, ionGenerator, nightLight, standingLamp } =
    properties;
  const { ceilingLightPlus, moodLight, onlyNightLight } = scenes;

  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

  const offOrElse = (cause: string, fn: (cause: string) => void) => () => {
    if (getMain(allLights)) {
      setMain(allLights, false, () =>
        l(
          `${cause} turned off ${p(allLights)}, because ${p(allLights)} was on`,
        ),
      );

      return;
    }

    fn(cause);
  };

  button.state.observe(
    offOrElse(`${p(button)}`, (cause) =>
      setMain(onlyNightLight, true, () =>
        l(
          `${cause} turned on ${p(onlyNightLight)}, because ${p(allLights)} was off`,
        ),
      ),
    ),
  );

  multiButton.state.topLeft.observe(
    offOrElse(`${p(multiButton)} topLeft`, (cause) =>
      setMain(moodLight, true, () =>
        l(
          `${cause} turned on ${p(moodLight)}, because ${p(allLights)} was off`,
        ),
      ),
    ),
  );

  multiButton.state.topRight.observe(
    offOrElse(`${p(multiButton)} topRight`, (cause) =>
      setMain(ceilingLightPlus, true, () =>
        l(
          `${cause} turned on ${p(ceilingLightPlus)}, because ${p(allLights)} was off`,
        ),
      ),
    ),
  );

  multiButton.state.bottomLeft.observe(() => {
    l(`${p(multiButton)} bottomLeft triggering sceneCycle to previous`);
    sceneCycle.previous();
  });

  multiButton.state.bottomRight.observe(() => {
    l(`${p(multiButton)} bottomRight triggering sceneCycle to next`);
    sceneCycle.next();
  });

  heatLampButton.state.up(() =>
    flipMain(heatLamp, () =>
      l(
        `${p(heatLampButton)} ${heatLampButton.state.up.name} flipped ${p(heatLamp)}`,
      ),
    ),
  );

  heatLampButton.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(heatLampButton)} ${heatLampButton.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  ionGeneratorButton.state.up(() =>
    flipMain(ionGenerator, () =>
      l(
        `${p(ionGeneratorButton)} ${ionGeneratorButton.state.up.name} flipped ${p(ionGenerator)}`,
      ),
    ),
  );

  ionGeneratorButton.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(ionGeneratorButton)} ${ionGeneratorButton.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  nightLightButton.state.up(() =>
    flipMain(nightLight, () =>
      l(
        `${p(nightLightButton)} ${nightLightButton.state.up.name} flipped ${p(nightLight)}`,
      ),
    ),
  );

  nightLightButton.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(nightLightButton)} ${nightLightButton.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  standingLampButton.state.up(() =>
    flipMain(standingLamp, () =>
      l(
        `${p(standingLampButton)} ${standingLampButton.state.up.name} flipped ${p(standingLamp)}`,
      ),
    ),
  );

  standingLampButton.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(standingLampButton)} ${standingLampButton.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  wallswitchBed.state.up(() =>
    flipMain(ceilingLight, () =>
      l(
        `${p(wallswitchBed)} ${wallswitchBed.state.up.name} flipped ${p(ceilingLight)}`,
      ),
    ),
  );

  wallswitchBed.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(wallswitchBed)} ${wallswitchBed.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  wallswitchDoorLeft.state.up(() => {
    if (!getMain(allLights)) {
      setMain(onlyNightLight, true, () =>
        l(
          `${p(wallswitchDoorLeft)} ${wallswitchDoorLeft.state.up.name} turned on ${p(onlyNightLight)}, because ${p(allLights)} was off`,
        ),
      );

      return;
    }

    l(
      `${p(wallswitchDoorLeft)} ${wallswitchDoorLeft.state.up.name} triggering sceneCycle to previous`,
    );
    sceneCycle.previous();
  });

  wallswitchDoorLeft.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(wallswitchDoorLeft)} ${wallswitchDoorLeft.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  wallswitchDoorMiddle.state.up(() =>
    offOrElse(
      `${p(wallswitchDoorMiddle)} ${wallswitchDoorMiddle.state.up.name}`,
      (cause) =>
        setMain(moodLight, true, () =>
          l(
            `${cause} turned on ${p(moodLight)}, because ${p(allLights)} was off`,
          ),
        ),
    ),
  );

  wallswitchDoorMiddle.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(wallswitchDoorMiddle)} ${wallswitchDoorMiddle.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  wallswitchDoorRight.state.up(() => {
    if (!getMain(allLights)) {
      setMain(ceilingLightPlus, true, () =>
        l(
          `${p(wallswitchDoorRight)} ${wallswitchDoorRight.state.up.name} turned on ${p(ceilingLightPlus)}, because ${p(allLights)} was off`,
        ),
      );

      return;
    }

    l(
      `${p(wallswitchDoorRight)} ${wallswitchDoorRight.state.up.name} triggering sceneCycle to next`,
    );
    sceneCycle.next();
  });

  wallswitchDoorRight.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(wallswitchDoorRight)} ${wallswitchDoorRight.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  sceneCycle.observe((value) =>
    setMain(value, true, () => l(`sceneCycle triggering ${p(value)}`)),
  );

  for (const aScene of Object.values(scenes)) {
    aScene.main.state.observe((value) => {
      if (!value) return;
      sceneCycle.value = aScene;
    });
  }
};

export const mrpelzBedroom = {
  $: 'mrpelzBedroom' as const,
  $init,
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...instances,
  ...properties,
  ...scenes,
};
