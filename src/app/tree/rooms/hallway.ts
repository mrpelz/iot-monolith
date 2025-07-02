import { epochs } from '../../../lib/epochs.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { door } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { ev1527Transport } from '../bridges.js';

export const devices = {
  ceilingLightBack: sonoffBasic(
    'lighting' as const,
    'hallway-ceilinglightback.lan.wurstsalat.cloud',
    context,
  ),
  ceilingLightFront: shelly1(
    'lighting' as const,
    'hallway-ceilinglightfront.lan.wurstsalat.cloud',
    context,
  ),
  doorSensor: ev1527WindowSensor(55_024, ev1527Transport, context),
  wallswitchBack: shellyi3(
    'hallway-wallswitchback.lan.wurstsalat.cloud',
    context,
  ),
  wallswitchFront: shellyi3(
    'hallway-wallswitchfront.lan.wurstsalat.cloud',
    context,
  ),
};

export const instances = {
  wallswitchBack: devices.wallswitchBack.button0.state,
  wallswitchFrontLeft: devices.wallswitchFront.button0.state,
  wallswitchFrontMiddle: devices.wallswitchFront.button1.state,
  wallswitchFrontRight: devices.wallswitchFront.button2.state,
  wallswitchMiddle: devices.wallswitchBack.button1.state,
};

const partialProperties = {
  ceilingLightBack: devices.ceilingLightBack.internal.relay,
  ceilingLightFront: devices.ceilingLightFront.internal.relay,
  entryDoor: door(context, devices.doorSensor, 'security'),
};

export const properties = {
  entryDoorTimer: offTimer(context, epochs.minute * 3, undefined),
  ...partialProperties,
};

export const groups = {
  allLights: outputGrouping(
    context,
    [properties.ceilingLightBack, properties.ceilingLightFront],
    'lighting',
  ),
  ceilingLight: outputGrouping(
    context,
    [properties.ceilingLightBack, properties.ceilingLightFront],
    'lighting',
  ),
};

const $init: InitFunction = async (room, introspection) => {
  const {
    allLights: allLights_,
    allThings: allThings_,
    kitchenAdjacentLights,
  } = await import('../groups.js');
  const { kitchenAdjacentChillax } = await import('../scenes.js');

  const allLights = await allLights_;
  const allThings = await allThings_;

  const log = logger.getInput({
    head: introspection.getObject(room)?.mainReference?.pathString,
  });

  const kitchenAdjecentsLightsOffKitchenChillaxOn = (cause: string) => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;

      log.log(
        logicReasoningLevel,
        () =>
          `"${cause}" turned off "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" because "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" was on`,
      );

      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;

    log.log(
      logicReasoningLevel,
      () =>
        `"${cause}" turned on "${introspection.getObject(kitchenAdjacentChillax)?.mainReference?.pathString}" because "${introspection.getObject(kitchenAdjacentLights)?.mainReference?.pathString}" was off`,
    );
  };

  instances.wallswitchBack.up(() => {
    groups.ceilingLight.flip.setState.trigger();

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchBack.up" flipped "${introspection.getObject(groups.ceilingLight)?.mainReference?.pathString}"`,
    );
  });

  instances.wallswitchBack.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn('wallswitchBack.longPress'),
  );

  instances.wallswitchMiddle.up(() => {
    groups.ceilingLight.flip.setState.trigger();

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchMiddle.up" flipped "${introspection.getObject(groups.ceilingLight)?.mainReference?.pathString}"`,
    );
  });

  instances.wallswitchMiddle.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn('wallswitchMiddle.longPress'),
  );

  instances.wallswitchFrontLeft.up(() => {
    properties.ceilingLightFront.flip.setState.trigger();

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchFrontLeft.up" flipped "${introspection.getObject(properties.ceilingLightFront)?.mainReference?.pathString}"`,
    );
  });

  instances.wallswitchFrontLeft.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn('wallswitchFrontLeft.longPress'),
  );

  instances.wallswitchFrontMiddle.up(() => {
    properties.ceilingLightBack.flip.setState.trigger();

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchFrontMiddle.up" flipped "${introspection.getObject(properties.ceilingLightBack)?.mainReference?.pathString}"`,
    );
  });
  instances.wallswitchFrontMiddle.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      'wallswitchFrontMiddle.longPress',
    ),
  );

  instances.wallswitchFrontRight.up(async () => {
    allThings.main.setState.value = false;

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchFrontRight.up" turned off "${introspection.getObject(allLights)?.mainReference?.pathString}"`,
    );
  });
  instances.wallswitchFrontRight.longPress(async () => {
    allLights.flip.setState.trigger();

    log.log(
      logicReasoningLevel,
      () =>
        `"wallswitchFrontRight.longPress" flipped "${introspection.getObject(allLights)?.mainReference?.pathString}"`,
    );
  });

  properties.entryDoor.open.main.state.observe((value) => {
    if (!value) {
      if (!groups.ceilingLight.main.state.value) {
        log.log(
          logicReasoningLevel,
          () =>
            `"${introspection.getObject(properties.entryDoor.open)?.mainReference?.pathString}" was closed, but "${introspection.getObject(properties.entryDoorTimer)?.mainReference?.pathString}" wasn’t activated, because "${introspection.getObject(groups.ceilingLight)?.mainReference?.pathString}" is already off`,
        );

        return;
      }

      properties.entryDoorTimer.state.start();

      log.log(
        logicReasoningLevel,
        () =>
          `"${introspection.getObject(properties.entryDoor.open)?.mainReference?.pathString}" was closed and "${introspection.getObject(properties.entryDoorTimer)?.mainReference?.pathString}" was activated, because "${introspection.getObject(groups.ceilingLight)?.mainReference?.pathString}" is on`,
      );

      return;
    }

    properties.ceilingLightFront.main.setState.value = true;
    properties.entryDoorTimer.state.start();

    log.log(
      logicReasoningLevel,
      () =>
        `"${introspection.getObject(properties.entryDoor.open)?.mainReference?.pathString}" was opened, "${introspection.getObject(properties.ceilingLightFront)?.mainReference?.pathString}" was turned on and "${introspection.getObject(properties.entryDoorTimer)?.mainReference?.pathString}" was activated`,
    );
  });

  groups.ceilingLight.main.setState.observe(() => {
    properties.entryDoorTimer.state.stop();

    log.log(
      logicReasoningLevel,
      () =>
        `"${introspection.getObject(properties.entryDoorTimer)?.mainReference?.pathString}" was deactivated because "${introspection.getObject(groups.ceilingLight)?.mainReference?.pathString}" was manually set`,
    );
  }, true);

  properties.entryDoorTimer.state.observe(() => {
    groups.ceilingLight.main.setState.value = false;

    log.log(
      logicReasoningLevel,
      () =>
        `"${introspection.getObject(groups.ceilingLight)?.mainReference?.pathString}" was turned off because "${introspection.getObject(properties.entryDoorTimer)?.mainReference?.pathString}" ran out`,
    );
  });
};

export const hallway = {
  $: 'hallway' as const,
  $init,
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
};
