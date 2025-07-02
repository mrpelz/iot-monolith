import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
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

  const log = logger.getInput({
    head: introspection.getObject(room)?.mainReference?.pathString,
  });

  instances.wallswitchFrontTop.up(() => {
    groups.allLights.flip.setState.trigger();

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchFrontTop.up" flipped "${introspection.getObject(groups.allLights)?.mainReference?.pathString}"`,
    );
  });

  instances.wallswitchFrontTop.longPress(() => {
    if (kitchenAdjacentLights.main.state.value) {
      kitchenAdjacentLights.main.setState.value = false;

      log.log(
        logicReasoningLevel,
        () =>
          `"wallswitchFrontTop.longPress" turned off "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" because "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" was on`,
      );

      return;
    }

    kitchenAdjacentBright.main.setState.value = true;

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchFrontTop.longPress" turned on "${introspection.getObject(kitchenAdjacentBright)?.mainReference?.pathString}" because "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" was off`,
    );
  });

  instances.wallswitchFrontBottomLeft.up(() => {
    groups.worklightWWhite.flip.setState.trigger();

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchFrontBottomLeft.up" flipped "${introspection.getObject(groups.worklightWWhite)?.mainReference?.pathString}"`,
    );
  });

  instances.wallswitchFrontBottomLeft.longPress(() => {
    if (kitchenAdjacentLights.main.state.value) {
      kitchenAdjacentLights.main.setState.value = false;

      log.log(
        logicReasoningLevel,
        () =>
          `"wallswitchFrontBottomLeft.longPress" turned off "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" because "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" was on`,
      );

      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchFrontBottomLeft.longPress" turned on "${introspection.getObject(kitchenAdjacentChillax)?.mainReference?.pathString}" because "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" was off`,
    );
  });

  instances.wallswitchFrontBottomRight.up(() => {
    groups.floodlight.flip.setState.trigger();

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchFrontBottomRight.up" flipped "${introspection.getObject(groups.floodlight)?.mainReference?.pathString}"`,
    );
  });

  instances.wallswitchFrontBottomRight.longPress(() => {
    if (kitchenAdjacentLights.main.state.value) {
      kitchenAdjacentLights.main.setState.value = false;

      log.log(
        logicReasoningLevel,
        () =>
          `"wallswitchFrontBottomRight.longPress" turned off "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" because "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" was on`,
      );

      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchFrontBottomRight.longPress" turned on "${introspection.getObject(kitchenAdjacentChillax)?.mainReference?.pathString}" because "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" was off`,
    );
  });

  instances.wallswitchBack.up(() => {
    groups.allLights.flip.setState.trigger();

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchBack.up" flipped "${introspection.getObject(groups.allLights)?.mainReference?.pathString}"`,
    );
  });

  instances.wallswitchBack.longPress(() => {
    if (kitchenAdjacentLights.main.state.value) {
      kitchenAdjacentLights.main.setState.value = false;

      log.log(
        logicReasoningLevel,
        () =>
          `"wallswitchBack.longPress" turned off "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" because "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" was on`,
      );

      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchBack.longPress" turned on "${introspection.getObject(kitchenAdjacentChillax)?.mainReference?.pathString}" because "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" was off`,
    );
  });
};

export const kitchen = {
  $: 'kitchen' as const,
  $init,
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
};
