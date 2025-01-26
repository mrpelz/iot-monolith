import { led, output, scene as hapScene } from '../../../lib/hap/actuators.js';
import {
  brightness,
  doorOrWindow,
  humidity,
  temperature,
} from '../../../lib/hap/sensors.js';
import { EnumState } from '../../../lib/state.js';
import {
  SceneMember,
  ledGrouping,
  outputGrouping,
  scene,
} from '../../lib/tree/properties/actuators.js';
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
  door: door(devices.doorSensor),
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
  windowLeft: window(devices.windowSensorLeft),
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
    () => (groups.all.main.setState.value = false),
  );

  instances.ionGeneratorButton.up(() =>
    properties.ionGenerator.flip.setState.trigger(),
  );
  instances.ionGeneratorButton.longPress(
    () => (groups.all.main.setState.value = false),
  );

  instances.nightLightButton.up(() =>
    properties.nightLight.flip.setState.trigger(),
  );
  instances.nightLightButton.longPress(
    () => (groups.all.main.setState.value = false),
  );

  instances.standingLampButton.up(() =>
    properties.standingLamp.flip.setState.trigger(),
  );
  instances.standingLampButton.longPress(
    () => (groups.all.main.setState.value = false),
  );

  instances.wallswitchBed.up(() =>
    properties.ceilingLight.flip.setState.trigger(),
  );
  instances.wallswitchBed.longPress(
    () => (groups.all.main.setState.value = false),
  );

  instances.wallswitchDoorLeft.up(() => {
    if (!groups.allLights.main.setState.value) {
      scenes.onlyNightLight.main.setState.value = true;
      return;
    }

    sceneCycle.previous();
  });
  instances.wallswitchDoorLeft.longPress(
    () => (groups.all.main.setState.value = false),
  );

  instances.wallswitchDoorMiddle.up(() => {
    if (groups.allLights.main.setState.value) {
      groups.allLights.main.setState.value = false;
      return;
    }

    scenes.moodLight.main.setState.value = true;
  });
  instances.wallswitchDoorMiddle.longPress(
    () => (groups.all.main.setState.value = false),
  );

  instances.wallswitchDoorRight.up(() => {
    if (!groups.allLights.main.setState.value) {
      scenes.ceilingLightPlus.main.setState.value = true;
      return;
    }

    sceneCycle.next();
  });
  instances.wallswitchDoorRight.longPress(
    () => (groups.all.main.setState.value = false),
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
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
};

hap.addAccessories(
  {
    displayName: 'mrpelz’s Bedroom Bookshelf LED Down',
    id: `${mrpelzBedroom.$}.bookshelfLedDown`,
    services: [
      led(
        'bookshelfLedDown',
        'Bookshelf LED Down',
        properties.bookshelfLedDown,
      ),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Bookshelf LED Up Red',
    id: `${mrpelzBedroom.$}.bookshelfLedUpRed`,
    services: [
      led(
        'bookshelfLedUpRed',
        'Bookshelf LED Up Red',
        properties.bookshelfLedUpRed,
      ),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Bookshelf LED Up Warm White',
    id: `${mrpelzBedroom.$}.bookshelfLedUpWWhite`,
    services: [
      led(
        'bookshelfLedUpWWhite',
        'Bookshelf LED Up Warm White',
        properties.bookshelfLedUpWWhite,
      ),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Brightness',
    id: `${mrpelzBedroom.$}.brightness`,
    services: [brightness('brightness', 'Brightness', properties.brightness)],
  },
  {
    displayName: 'mrpelz’s Bedroom Ceiling Light',
    id: `${mrpelzBedroom.$}.ceilingLight`,
    services: [
      output('ceilingLight', 'Ceiling Light', properties.ceilingLight),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Door',
    id: `${mrpelzBedroom.$}.door`,
    services: [doorOrWindow('door', 'Door', properties.door)],
  },
  {
    displayName: 'mrpelz’s Bedroom Heat Lamp',
    id: `${mrpelzBedroom.$}.heatLamp`,
    services: [output('heatLamp', 'Heat Lamp', properties.heatLamp)],
  },
  {
    displayName: 'mrpelz’s Bedroom Humidity',
    id: `${mrpelzBedroom.$}.humidity`,
    services: [humidity('humidity', 'Humidity', properties.humidity)],
  },
  {
    displayName: 'mrpelz’s Bedroom Ion Generator',
    id: `${mrpelzBedroom.$}.ionGenerator`,
    services: [
      output('ionGenerator', 'Ion Generator', properties.ionGenerator),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Night Light',
    id: `${mrpelzBedroom.$}.nightLight`,
    services: [output('nightLight', 'Night Light', properties.nightLight)],
  },
  {
    displayName: 'mrpelz’s Bedroom Nightstand Left LED Red',
    id: `${mrpelzBedroom.$}.nightstandLeftLedRed`,
    services: [
      led(
        'nightstandLeftLedRed',
        'Nightstand Left LED Red',
        properties.nightstandLeftLedRed,
      ),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Nightstand Left LED Warm White',
    id: `${mrpelzBedroom.$}.nightstandLeftLedWWhite`,
    services: [
      led(
        'nightstandLeftLedWWhite',
        'Nightstand Left LED Warm White',
        properties.nightstandLeftLedWWhite,
      ),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Nightstand Right LED Red',
    id: `${mrpelzBedroom.$}.nightstandRightLedRed`,
    services: [
      led(
        'nightstandRightLedRed',
        'Nightstand Right LED Red',
        properties.nightstandRightLedRed,
      ),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Nightstand Right LED Warm White',
    id: `${mrpelzBedroom.$}.nightstandRightLedWWhite`,
    services: [
      led(
        'nightstandRightLedWWhite',
        'Nightstand Right LED Warm White',
        properties.nightstandRightLedWWhite,
      ),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Standing Lamp',
    id: `${mrpelzBedroom.$}.standingLamp`,
    services: [
      output('standingLamp', 'Standing Lamp', properties.standingLamp),
    ],
  },
  {
    displayName: 'mrpelz’s Temperature',
    id: `${mrpelzBedroom.$}.temperature`,
    services: [
      temperature('temperature', 'Temperature', properties.temperature),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Window Left',
    id: `${mrpelzBedroom.$}.windowLeft`,
    services: [
      doorOrWindow('windowLeft', 'Window Left', properties.windowLeft),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom All',
    id: `${mrpelzBedroom.$}.all`,
    services: [output('all', 'All', groups.all)],
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
    displayName: 'mrpelz’s Bedroom Red LEDs',
    id: `${mrpelzBedroom.$}.redLeds`,
    services: [led('redLeds', 'Red LEDs', groups.redLeds)],
  },
  {
    displayName: 'mrpelz’s Bedroom Warm White LEDs',
    id: `${mrpelzBedroom.$}.wWhiteLeds`,
    services: [led('wWhiteLeds', 'Warm White LEDs', groups.wWhiteLeds)],
  },
  {
    displayName: 'mrpelz’s Bedroom All Off',
    id: `${mrpelzBedroom.$}.allOff`,
    services: [hapScene('allOff', 'All Off', scenes.allOff)],
  },
  {
    displayName: 'mrpelz’s Bedroom All Red',
    id: `${mrpelzBedroom.$}.allred`,
    services: [hapScene('allRed', 'All Red', scenes.allRed)],
  },
  {
    displayName: 'mrpelz’s Bedroom Only Night Light',
    id: `${mrpelzBedroom.$}.onlyNightLight`,
    services: [
      hapScene('onlyNightLight', 'Only Night Light', scenes.onlyNightLight),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Mood Light',
    id: `${mrpelzBedroom.$}.moodLight`,
    services: [hapScene('moodLight', 'Mood Light', scenes.moodLight)],
  },
  {
    displayName: 'mrpelz’s Bedroom Ceiling Light Plus',
    id: `${mrpelzBedroom.$}.ceilingLightPlus`,
    services: [
      hapScene(
        'ceilingLightPlus',
        'Ceiling Light Plus',
        scenes.ceilingLightPlus,
      ),
    ],
  },
  {
    displayName: 'mrpelz’s Bedroom Everything On',
    id: `${mrpelzBedroom.$}.everythingOn`,
    services: [hapScene('everythingOn', 'Everything On', scenes.everythingOn)],
  },
);
