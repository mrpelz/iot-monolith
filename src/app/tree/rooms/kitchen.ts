/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level } from '../../../lib/tree/main.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { ev1527ButtonX1 } from '../../../lib/tree/devices/ev1527-button.js';
import { ev1527Transport } from '../../tree/bridges.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { inputGrouping } from '../../../lib/tree/properties/sensors.js';
import { ledGrouping } from '../../../lib/tree/properties/actuators.js';
import { logger } from '../../logging.js';
import { persistence } from '../../persistence.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { timings } from '../../timings.js';

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
  leftButton: devices.leftButton.props.state,
  wallswitchBack: devices.wallswitchBack.props.button0.props.state,
  wallswitchFrontBottomLeft: devices.wallswitchFront.props.button1.props.state,
  wallswitchFrontBottomRight: devices.wallswitchFront.props.button2.props.state,
  wallswitchFrontTop: devices.wallswitchFront.props.button0.props.state,
};

export const properties = {
  ledLeftCWhite: devices.ledsLeft.props.internal.ledG,
  ledLeftFloodlight: devices.ledsLeft.props.internal.ledB,
  ledLeftWWhite: devices.ledsLeft.props.internal.ledR,
  ledRightCWhite: devices.ledsRight.props.internal.ledB,
  ledRightFloodlight: devices.ledsRight.props.internal.ledW1,
  ledRightWWhite: devices.ledsRight.props.internal.ledG,
  window: new Element({
    level: Level.AREA as const,
    open: devices.windowSensor.props.internal.open,
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
  allWindows: inputGrouping(
    properties.window.props.open.props.main.props.state
  ),
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

  instances.leftButton.observe(() =>
    groups.allLights.props.flip.props.state.trigger()
  );

  instances.wallswitchFrontTop.up(() =>
    groups.allLights.props.flip.props.state.trigger()
  );
  instances.wallswitchFrontTop.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.state.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentBright.props.main.props.setState.value = true;
  });

  instances.wallswitchFrontBottomLeft.up(() =>
    groups.worklightWWhite.props.flip.props.state.trigger()
  );
  instances.wallswitchFrontBottomLeft.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.state.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });

  instances.wallswitchFrontBottomRight.up(() =>
    groups.floodlight.props.flip.props.state.trigger()
  );
  instances.wallswitchFrontBottomRight.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.state.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });

  instances.wallswitchBack.up(() =>
    groups.allLights.props.flip.props.state.trigger()
  );
  instances.wallswitchBack.longPress(() => {
    if (kitchenAdjacentLights.props.main.props.state.value) {
      kitchenAdjacentLights.props.main.props.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.props.main.props.setState.value = true;
  });
})();

export const kitchen = new Element({
  $: 'kitchen' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
