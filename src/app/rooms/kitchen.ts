/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import { ev1527ButtonX1 } from '../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../lib/tree/devices/h801.js';
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
    'kitchen-ledsleft.iot.wurstsalat.cloud'
  ),
  ledsRight: h801(
    logger,
    persistence,
    timings,
    'kitchen-ledsright.iot.wurstsalat.cloud'
  ),
  leftButton: ev1527ButtonX1(ev1527Transport, 898570, logger),
  wallswitchBack: shellyi3(
    logger,
    timings,
    'kitchen-wallswitchback.iot.wurstsalat.cloud'
  ),
  wallswitchFront: shellyi3(
    logger,
    timings,
    'kitchen-wallswitchfront.iot.wurstsalat.cloud'
  ),
  windowSensor: ev1527WindowSensor(logger, ev1527Transport, 841520),
};

export const instances = {
  leftButton: devices.leftButton.$,
  wallswitchBack: devices.wallswitchBack.button0.$,
  wallswitchFrontBottomLeft: devices.wallswitchFront.button1.$,
  wallswitchFrontBottomRight: devices.wallswitchFront.button2.$,
  wallswitchFrontTop: devices.wallswitchFront.button0.$,
};

export const properties = {
  ledLeftCWhite: devices.ledsLeft.ledG,
  ledLeftFloodlight: devices.ledsLeft.ledB,
  ledLeftWWhite: devices.ledsLeft.ledR,
  ledRightCWhite: devices.ledsRight.ledB,
  ledRightFloodlight: devices.ledsRight.ledW1,
  ledRightWWhite: devices.ledsRight.ledG,
  windowOpen: devices.windowSensor.open,
  windowSensorTampered: devices.windowSensor.tamperSwitch,
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

  instances.leftButton.observe(() => groups.allLights._set.flip());

  instances.wallswitchFrontTop.up(() => groups.allLights._set.flip());
  instances.wallswitchFrontTop.longPress(
    () => (kitchenAdjacentLights._set.value = false)
  );

  instances.wallswitchFrontBottomLeft.up(() =>
    groups.worklightWWhite._set.flip()
  );
  instances.wallswitchFrontBottomLeft.longPress(
    () => (kitchenAdjacentLights._set.value = false)
  );

  instances.wallswitchFrontBottomRight.up(() => groups.floodlight._set.flip());
  instances.wallswitchFrontBottomRight.longPress(
    () => (kitchenAdjacentLights._set.value = false)
  );

  instances.wallswitchBack.up(() => groups.allLights._set.flip());
  instances.wallswitchBack.longPress(
    () => (kitchenAdjacentLights._set.value = false)
  );
})();

export const kitchen = {
  ...groups,
  ...properties,
  devices,
};

metadataStore.set(kitchen, {
  isDaylit: true,
  level: Levels.ROOM,
  name: 'kitchen',
});
