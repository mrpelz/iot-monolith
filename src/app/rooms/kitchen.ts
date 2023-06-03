/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level, symbolLevel } from '../../lib/tree/main-ng.js';
import { Levels, addMeta } from '../../lib/tree/main.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../lib/tree/devices/h801.js';
import { inputGrouping } from '../../lib/tree/properties/sensors.js';
import { ledGrouping } from '../../lib/tree/properties/actuators.js';
import { logger } from '../logging.js';
import { persistence } from '../persistence.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { timings } from '../timings.js';

export const devices = {
  ledsLeft: h801(
    logger,
    persistence,
    timings,
    'kitchen-ledsleft.lan.wurstsalat.cloud'
  ),
  ledsRight: h801(
    logger,
    persistence,
    timings,
    'kitchen-ledsright.lan.wurstsalat.cloud'
  ),
  leftButton: ev1527ButtonX1(ev1527Transport, 898570, logger),
  wallswitchBack: shellyi3(
    logger,
    persistence,
    timings,
    'kitchen-wallswitchback.lan.wurstsalat.cloud'
  ),
  wallswitchFront: shellyi3(
    logger,
    persistence,
    timings,
    'kitchen-wallswitchfront.lan.wurstsalat.cloud'
  ),
  windowSensor: ev1527WindowSensor(
    logger,
    persistence,
    ev1527Transport,
    841520
  ),
};

export const instances = {
  leftButton: devices.leftButton.$.i,
  wallswitchBack: devices.wallswitchBack.$.button0.$.i,
  wallswitchFrontBottomLeft: devices.wallswitchFront.$.button1.$.i,
  wallswitchFrontBottomRight: devices.wallswitchFront.$.button2.$.i,
  wallswitchFrontTop: devices.wallswitchFront.$.button0.$.i,
};

export const properties = {
  ledLeftCWhite: devices.ledsLeft.$.ledG,
  ledLeftFloodlight: devices.ledsLeft.$.ledB,
  ledLeftWWhite: devices.ledsLeft.$.ledR,
  ledRightCWhite: devices.ledsRight.$.ledB,
  ledRightFloodlight: devices.ledsRight.$.ledW1,
  ledRightWWhite: devices.ledsRight.$.ledG,
  window: new Element({
    open: devices.windowSensor.$.open,
    [symbolLevel]: Level.AREA,
  }),
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
  allWindows: inputGrouping(properties.window.$.open.$.m.$.i),
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
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../scenes.js'
  );

  instances.leftButton.observe(() => groups.allLights.$.flip.$.i.trigger());

  instances.wallswitchFrontTop.up(() => groups.allLights.$.flip.$.i.trigger());
  instances.wallswitchFrontTop.longPress(() => {
    if (kitchenAdjacentLights.$.m.$.i.value) {
      kitchenAdjacentLights.$.m.$.setState.value = false;
      return;
    }

    kitchenAdjacentBright.$.m.$.setState.value = true;
  });

  instances.wallswitchFrontBottomLeft.up(() =>
    groups.worklightWWhite.$.flip.$.i.trigger()
  );
  instances.wallswitchFrontBottomLeft.longPress(() => {
    if (kitchenAdjacentLights.$.m.$.i.value) {
      kitchenAdjacentLights.$.m.$.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.$.m.$.setState.value = true;
  });

  instances.wallswitchFrontBottomRight.up(() =>
    groups.floodlight.$.flip.$.i.trigger()
  );
  instances.wallswitchFrontBottomRight.longPress(() => {
    if (kitchenAdjacentLights.$.m.$.i.value) {
      kitchenAdjacentLights.$.m.$.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.$.m.$.setState.value = true;
  });

  instances.wallswitchBack.up(() => groups.allLights.$.flip.$.i.trigger());
  instances.wallswitchBack.longPress(() => {
    if (kitchenAdjacentLights.$.m.$.i.value) {
      kitchenAdjacentLights.$.m.$.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.$.m.$.setState.value = true;
  });
})();

export const kitchen = addMeta(
  {
    devices,
    ...groups,
    ...properties,
  },
  {
    isDaylit: true,
    level: Levels.ROOM,
    name: 'kitchen',
  }
);
