import { ModifiableDate, Unit } from '@mrpelz/modifiable-date';

import { makeCustomStringLogger } from '../../../lib/log.js';
import { Schedule } from '../../../lib/schedule.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { shelly1WithInput } from '../../../lib/tree/devices/shelly1.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { flipMain, getMain, setMain } from '../../../lib/tree/logic.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { door } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { automatedInputLogic, manualInputLogic } from '../../util.js';
import { ev1527Transport } from '../bridges.js';

export const devices = {
  ceilingLightBack: sonoffBasic(
    'lighting' as const,
    'hallway-ceilinglightback.lan.wurstsalat.cloud',
    context,
  ),
  ceilingLightFront: shelly1WithInput(
    'lighting' as const,
    'motion' as const,
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
  wallswitchBack: devices.wallswitchBack.button0,
  wallswitchFrontLeft: devices.wallswitchFront.button0,
  wallswitchFrontMiddle: devices.wallswitchFront.button1,
  wallswitchFrontRight: devices.wallswitchFront.button2,
  wallswitchMiddle: devices.wallswitchBack.button1,
};

export const properties = {
  ceilingLightBack: devices.ceilingLightBack.relay,
  ceilingLightFront: devices.ceilingLightFront.relay,
  entryDoor: door(context, devices.doorSensor, 'open'),
  motion: devices.ceilingLightFront.input,
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

export const logic = {
  ceilingLightFrontLogic: automatedInputLogic(
    properties.ceilingLightFront,
    [properties.motion, properties.entryDoor],
    [instances.wallswitchFrontLeft],
    undefined,
    undefined,
    new Schedule(
      context.logger,
      (last) =>
        new ModifiableDate(last)
          //                           UTC
          .forwardUntil({ [Unit.HOUR]: 6 })
          .truncateTo(Unit.HOUR).date,
    ),
    new Schedule(
      context.logger,
      (last) =>
        new ModifiableDate(last)
          //                           UTC
          .forwardUntil({ [Unit.HOUR]: 23 })
          .truncateTo(Unit.HOUR).date,
    ),
  ),
  ceilingLightLogic: manualInputLogic(groups.ceilingLight, [
    instances.wallswitchBack,
    instances.wallswitchFrontMiddle,
    instances.wallswitchMiddle,
  ]),
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

  const {
    wallswitchBack,
    wallswitchFrontLeft,
    wallswitchFrontMiddle,
    wallswitchFrontRight,
    wallswitchMiddle,
  } = instances;

  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

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

  wallswitchBack.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchBack)} ${wallswitchBack.state.longPress.name}`,
    ),
  );

  wallswitchMiddle.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchMiddle)} ${wallswitchMiddle.state.longPress.name}`,
    ),
  );

  wallswitchFrontLeft.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchFrontLeft)} ${wallswitchFrontLeft.state.longPress.name}`,
    ),
  );

  wallswitchFrontMiddle.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchFrontMiddle)} ${wallswitchFrontMiddle.state.longPress.name}`,
    ),
  );

  wallswitchFrontRight.state.up(() =>
    setMain(allThings, false, () =>
      l(
        `${p(wallswitchFrontRight)} ${wallswitchFrontRight.state.up.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  wallswitchFrontRight.state.longPress(() =>
    flipMain(allLights, () =>
      l(
        `${p(wallswitchFrontRight)} ${wallswitchFrontRight.state.longPress.name} flipped ${p(allLights)}`,
      ),
    ),
  );
};

export const hallway = {
  $: 'hallway' as const,
  $init,
  devices: deviceMap(devices),
  level: Level.ROOM as const,
  ...groups,
  ...instances,
  ...logic,
  ...properties,
};
