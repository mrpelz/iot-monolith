import { makeCustomStringLogger } from '../../../lib/log.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { flipMain, getMain, setMain } from '../../../lib/tree/logic.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import { ledGrouping } from '../../../lib/tree/properties/actuators.js';
import { inputGrouping, window } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
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
  wallswitchBack: devices.wallswitchBack.button0,
  wallswitchFrontBottomLeft: devices.wallswitchFront.button1,
  wallswitchFrontBottomRight: devices.wallswitchFront.button2,
  wallswitchFrontTop: devices.wallswitchFront.button0,
};

export const properties = {
  ledLeftCWhite: devices.ledsLeft.ledG,
  ledLeftFloodlight: devices.ledsLeft.ledB,
  ledLeftWWhite: devices.ledsLeft.ledR,
  ledRightCWhite: devices.ledsRight.ledB,
  ledRightFloodlight: devices.ledsRight.ledW1,
  ledRightWWhite: devices.ledsRight.ledG,
  window: window(context, devices.windowSensor, 'security'),
};

export const groups = {
  allLights: ledGrouping(context, [
    properties.ledLeftCWhite,
    properties.ledLeftFloodlight,
    properties.ledLeftWWhite,
    properties.ledRightCWhite,
    properties.ledRightFloodlight,
    properties.ledRightWWhite,
  ]),
  allWindows: inputGrouping(context, [properties.window], 'security'),
  cWhite: ledGrouping(context, [
    properties.ledLeftCWhite,
    properties.ledRightCWhite,
  ]),
  floodlight: ledGrouping(context, [
    properties.ledLeftFloodlight,
    properties.ledRightFloodlight,
  ]),
  wWhite: ledGrouping(context, [
    properties.ledLeftFloodlight,
    properties.ledLeftWWhite,
    properties.ledRightFloodlight,
    properties.ledRightWWhite,
  ]),
  worklight: ledGrouping(context, [
    properties.ledLeftCWhite,
    properties.ledLeftWWhite,
    properties.ledRightCWhite,
    properties.ledRightWWhite,
  ]),
  worklightWWhite: ledGrouping(context, [
    properties.ledLeftWWhite,
    properties.ledRightWWhite,
  ]),
};

const $init: InitFunction = async (room, introspection) => {
  const { kitchenAdjacentLights } = await import('../../tree/groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../../tree/scenes.js'
  );

  const { allLights, floodlight, worklightWWhite } = groups;
  const {
    wallswitchBack,
    wallswitchFrontBottomLeft,
    wallswitchFrontBottomRight,
    wallswitchFrontTop,
  } = instances;

  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

  const kitchenAdjecentsLightsOffKitchenBrightOn = (cause: string) => {
    if (getMain(kitchenAdjacentLights)) {
      setMain(kitchenAdjacentLights, false, () =>
        l(
          `${cause} turned off ${p(kitchenAdjacentLights)} because ${p(kitchenAdjacentLights)} was on`,
        ),
      );

      return;
    }

    setMain(kitchenAdjacentBright, true, () =>
      l(
        `${cause} turned on ${p(kitchenAdjacentBright)} because ${p(kitchenAdjacentLights)} was off`,
      ),
    );
  };

  const kitchenAdjecentsLightsOffKitchenChillaxOn = (cause: string) => {
    if (getMain(kitchenAdjacentLights)) {
      setMain(kitchenAdjacentLights, false, () =>
        l(
          `${cause} turned off ${p(kitchenAdjacentLights)} because ${p(kitchenAdjacentLights)} was on`,
        ),
      );

      return;
    }

    setMain(kitchenAdjacentChillax, true, () =>
      l(
        `${cause} turned on ${p(kitchenAdjacentChillax)} because ${p(kitchenAdjacentLights)} was off`,
      ),
    );
  };

  wallswitchFrontTop.state.up(() =>
    flipMain(allLights, () =>
      l(
        `${p(wallswitchFrontTop)} ${wallswitchFrontTop.state.up.name} flipped ${p(allLights)}`,
      ),
    ),
  );

  wallswitchFrontTop.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenBrightOn(
      `${p(wallswitchFrontTop)} ${wallswitchFrontTop.state.longPress.name}`,
    ),
  );

  wallswitchFrontBottomLeft.state.up(() =>
    flipMain(worklightWWhite, () =>
      l(
        `${p(wallswitchFrontBottomLeft)} ${wallswitchFrontBottomLeft.state.up.name} flipped ${p(worklightWWhite)}`,
      ),
    ),
  );

  wallswitchFrontBottomLeft.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchFrontBottomLeft)} ${wallswitchFrontBottomLeft.state.longPress.name}`,
    ),
  );

  wallswitchFrontBottomRight.state.up(() =>
    flipMain(floodlight, () =>
      l(
        `${p(wallswitchFrontBottomRight)} ${wallswitchFrontBottomRight.state.up.name} flipped ${p(floodlight)}`,
      ),
    ),
  );

  wallswitchFrontBottomRight.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchFrontBottomRight)} ${wallswitchFrontBottomRight.state.longPress.name}`,
    ),
  );

  wallswitchBack.state.up(() =>
    flipMain(allLights, () =>
      l(
        `${p(wallswitchBack)} ${wallswitchBack.state.up.name} flipped ${p(allLights)}`,
      ),
    ),
  );

  wallswitchBack.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchBack)} ${wallswitchBack.state.longPress.name}`,
    ),
  );
};

export const kitchen = {
  $: 'kitchen' as const,
  $init,
  devices: deviceMap(devices),
  level: Level.ROOM as const,
  ...groups,
  ...instances,
  ...properties,
};
