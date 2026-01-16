import { epochs } from '@mrpelz/modifiable-date';

import { makeCustomStringLogger } from '../../../lib/log.js';
import { ev1527MotionSensor } from '../../../lib/tree/devices/ev1527-motion-sensor.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { flipMain, getMain, setMain } from '../../../lib/tree/logic.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import {
  door,
  motion as motion_,
} from '../../../lib/tree/properties/sensors.js';
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
  motionSensor: ev1527MotionSensor(708_280, ev1527Transport, context),
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
  motion: devices.motionSensor.state,
  wallswitchBack: devices.wallswitchBack.button0,
  wallswitchFrontLeft: devices.wallswitchFront.button0,
  wallswitchFrontMiddle: devices.wallswitchFront.button1,
  wallswitchFrontRight: devices.wallswitchFront.button2,
  wallswitchMiddle: devices.wallswitchBack.button1,
};

const partialProperties = {
  ceilingLightBack: devices.ceilingLightBack.relay,
  ceilingLightFront: devices.ceilingLightFront.relay,
  entryDoor: door(context, devices.doorSensor, 'security'),
  motion: motion_(context, devices.motionSensor, 'security'),
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

  const { ceilingLight } = groups;
  const {
    wallswitchBack,
    wallswitchFrontLeft,
    wallswitchFrontMiddle,
    wallswitchFrontRight,
    wallswitchMiddle,
  } = instances;
  const {
    ceilingLightBack,
    ceilingLightFront,
    entryDoor,
    entryDoorTimer,
    motion,
  } = properties;

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

  wallswitchBack.state.up(() =>
    flipMain(ceilingLight, () =>
      l(
        `${p(wallswitchBack)} ${wallswitchBack.state.up.name} flipped ${p(ceilingLight)}`,
      ),
    ),
  );

  wallswitchBack.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchBack)} ${wallswitchBack.state.longPress.name}`,
    ),
  );

  wallswitchMiddle.state.up(() =>
    flipMain(ceilingLight, () =>
      l(
        `${p(wallswitchMiddle)} ${wallswitchMiddle.state.up.name} flipped ${p(ceilingLight)}`,
      ),
    ),
  );

  wallswitchMiddle.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchMiddle)} ${wallswitchMiddle.state.longPress.name}`,
    ),
  );

  wallswitchFrontLeft.state.up(() =>
    flipMain(ceilingLightFront, () =>
      l(
        `${p(wallswitchFrontLeft)} ${wallswitchFrontLeft.state.up.name} flipped ${p(ceilingLightFront)}`,
      ),
    ),
  );

  wallswitchFrontLeft.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchFrontLeft)} ${wallswitchFrontLeft.state.longPress.name}`,
    ),
  );

  wallswitchFrontMiddle.state.up(() =>
    flipMain(ceilingLightBack, () =>
      l(
        `${p(wallswitchFrontMiddle)} ${wallswitchFrontMiddle.state.up.name} flipped ${p(ceilingLightBack)}`,
      ),
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

  motion.state.observe((value) => {
    // when motion is detected, turn on front ceiling light and (re)start timer
    if (value) {
      setMain(ceilingLightFront, true, () => {
        l(
          `${p(motion)} was detected and ${p(ceilingLightFront)} was turned on`,
        );
      });

      l(`${p(motion)} was detected and ${p(entryDoorTimer)} was (re)started`);

      entryDoorTimer.state.start();
    }
  });

  entryDoor.open.main.state.observe((open) => {
    const wasOn = getMain(ceilingLight);

    // when entry door is opened, immediately turn on front ceiling light
    if (open) {
      setMain(ceilingLightFront, true, () => {
        l(
          `${p(entryDoor)} was opened and ${p(ceilingLightFront)} was turned on`,
        );
      });
    }

    // if entry door is opened OR if it is closed but the ceiling light is already on, (re)start the timer
    if (open || wasOn) {
      l(
        `${p(entryDoor)} was ${open ? 'opened' : 'closed'} with ${p(ceilingLight)} ${wasOn ? 'on' : 'off'} and ${p(entryDoorTimer)} was (re)started`,
      );

      entryDoorTimer.state.start();
    } else {
      l(
        `${p(entryDoor)} was ${open ? 'opened' : 'closed'} with ${p(ceilingLight)} ${wasOn ? 'on' : 'off'} and ${p(entryDoorTimer)} was not started`,
      );
    }
  });

  ceilingLight.main.setState.observe(() => {
    if (!entryDoorTimer.state.isActive.value) return;

    l(
      `${p(entryDoorTimer)} was deactivated because ${p(ceilingLight)} was manually set`,
    );

    entryDoorTimer.state.stop();
  });

  entryDoorTimer.state.observe(() =>
    setMain(ceilingLight, false, () =>
      l(
        `${p(ceilingLight)} was turned off because ${p(entryDoorTimer)} ran out`,
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
  ...properties,
};
