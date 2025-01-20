import { led } from '../../../lib/hap/actuators.js';
import { doorOrWindow } from '../../../lib/hap/sensors.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { ledGrouping } from '../../../lib/tree/properties/actuators.js';
import { inputGrouping, window } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { hap } from '../../hap.js';
import { ev1527Transport } from '../bridges.js';

export const devices = {
  ledsLeft: h801('kitchen-ledsleft.lan.wurstsalat.cloud', context),
  ledsRight: h801('kitchen-ledsright.lan.wurstsalat.cloud', context),
  wallswitchBack: shellyi3(
    'kitchen-wallswitchback.lan.wurstsalat.cloud',
    context,
  ),
  wallswitchFront: shellyi3(
    'kitchen-wallswitchfront.lan.wurstsalat.cloud',
    context,
  ),
  windowSensor: ev1527WindowSensor(841_520, ev1527Transport, context),
};

export const instances = {
  wallswitchBack: devices.wallswitchBack.button0.state,
  wallswitchFrontBottomLeft: devices.wallswitchFront.button1.state,
  wallswitchFrontBottomRight: devices.wallswitchFront.button2.state,
  wallswitchFrontTop: devices.wallswitchFront.button0.state,
};

export const properties = {
  ledLeftCWhite: devices.ledsLeft.internal.ledG,
  ledLeftFloodlight: devices.ledsLeft.internal.ledB,
  ledLeftWWhite: devices.ledsLeft.internal.ledR,
  ledRightCWhite: devices.ledsRight.internal.ledB,
  ledRightFloodlight: devices.ledsRight.internal.ledW1,
  ledRightWWhite: devices.ledsRight.internal.ledG,
  window: window(devices.windowSensor),
};

export const groups = {
  allLights: ledGrouping([
    properties.ledLeftCWhite,
    properties.ledLeftFloodlight,
    properties.ledLeftWWhite,
    properties.ledRightCWhite,
    properties.ledRightFloodlight,
    properties.ledRightWWhite,
  ]),
  allWindows: inputGrouping(properties.window.open.main.state),
  cWhite: ledGrouping([properties.ledLeftCWhite, properties.ledRightCWhite]),
  floodlight: ledGrouping([
    properties.ledLeftFloodlight,
    properties.ledRightFloodlight,
  ]),
  wWhite: ledGrouping([
    properties.ledLeftFloodlight,
    properties.ledLeftWWhite,
    properties.ledRightFloodlight,
    properties.ledRightWWhite,
  ]),
  worklight: ledGrouping([
    properties.ledLeftCWhite,
    properties.ledLeftWWhite,
    properties.ledRightCWhite,
    properties.ledRightWWhite,
  ]),
  worklightWWhite: ledGrouping([
    properties.ledLeftWWhite,
    properties.ledRightWWhite,
  ]),
};

(async () => {
  const { kitchenAdjacentLights } = await import('../../tree/groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../../tree/scenes.js'
  );

  instances.wallswitchFrontTop.up(() =>
    groups.allLights.flip.setState.trigger(),
  );
  instances.wallswitchFrontTop.longPress(() => {
    if (kitchenAdjacentLights.main.state.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentBright.main.setState.value = true;
  });

  instances.wallswitchFrontBottomLeft.up(() =>
    groups.worklightWWhite.flip.setState.trigger(),
  );
  instances.wallswitchFrontBottomLeft.longPress(() => {
    if (kitchenAdjacentLights.main.state.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });

  instances.wallswitchFrontBottomRight.up(() =>
    groups.floodlight.flip.setState.trigger(),
  );
  instances.wallswitchFrontBottomRight.longPress(() => {
    if (kitchenAdjacentLights.main.state.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });

  instances.wallswitchBack.up(() => groups.allLights.flip.setState.trigger());
  instances.wallswitchBack.longPress(() => {
    if (kitchenAdjacentLights.main.state.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  });
})();

export const kitchen = {
  $: 'kitchen' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
};

hap.addAccessories(
  {
    displayName: 'Kitchen All LEDs',
    id: `${kitchen.$}.allLeds`,
    services: [led('allLeds', 'All LEDs', groups.allLights)],
  },
  {
    displayName: 'Kitchen LEDs',
    id: `${kitchen.$}.leds`,
    services: [
      led('cWhite', 'Cold White', groups.cWhite),
      led('floodlight', 'Floodlight', groups.floodlight),
      led('wWhite', 'Warm White', groups.wWhite),
      led('worklight', 'Worklight', groups.worklight),
      led('worklightWWhite', 'Worklight Warm White', groups.worklightWWhite),
    ],
  },
  {
    displayName: 'Kitchen Door',
    id: `${kitchen.$}.door`,
    services: [doorOrWindow('window', 'Window', properties.window)],
  },
);
