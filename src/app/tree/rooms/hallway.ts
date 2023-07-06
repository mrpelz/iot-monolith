/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level } from '../../../lib/tree/main.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { epochs } from '../../../lib/epochs.js';
import { ev1527Transport } from '../../tree/bridges.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { logger } from '../../logging.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { persistence } from '../../persistence.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../../timings.js';

export const devices = {
  ceilingLightBack: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'hallway-ceilinglightback.lan.wurstsalat.cloud'
  ),
  ceilingLightFront: shelly1(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'hallway-ceilinglightfront.lan.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 55024),
  wallswitchBack: shellyi3(
    logger,
    persistence,
    timings,
    'hallway-wallswitchback.lan.wurstsalat.cloud'
  ),
  wallswitchFront: shellyi3(
    logger,
    persistence,
    timings,
    'hallway-wallswitchfront.lan.wurstsalat.cloud'
  ),
};

export const instances = {
  wallswitchBack: devices.wallswitchBack.props.button0.props.state,
  wallswitchFrontLeft: devices.wallswitchFront.props.button0.props.state,
  wallswitchFrontMiddle: devices.wallswitchFront.props.button1.props.state,
  wallswitchFrontRight: devices.wallswitchFront.props.button2.props.state,
  wallswitchMiddle: devices.wallswitchBack.props.button1.props.state,
};

const partialProperties = {
  ceilingLightBack: devices.ceilingLightBack.props.internal.relay,
  ceilingLightFront: devices.ceilingLightFront.props.internal.relay,
  door: new Element({
    level: Level.AREA as const,
    name: 'entryDoor',
    open: devices.doorSensor.props.internal.open,
  }),
};

export const groups = {
  allLights: outputGrouping([
    partialProperties.ceilingLightBack,
    partialProperties.ceilingLightFront,
  ]),
  ceilingLight: outputGrouping(
    [partialProperties.ceilingLightBack, partialProperties.ceilingLightFront],
    'lighting'
  ),
};

export const properties = {
  ...partialProperties,
  entryDoorTimer: offTimer(epochs.minute * 3, undefined, [
    'hallway/entryDoorTimer',
    persistence,
  ]),
};

(async () => {
  const { all, allLights } = await import('../groups.js');

  instances.wallswitchBack.up(() =>
    groups.ceilingLight.props.flip.props.state.trigger()
  );

  instances.wallswitchMiddle.up(() =>
    groups.ceilingLight.props.flip.props.state.trigger()
  );

  instances.wallswitchFrontLeft.up(() =>
    properties.ceilingLightFront.props.flip.props.state.trigger()
  );
  instances.wallswitchFrontMiddle.up(() =>
    properties.ceilingLightBack.props.flip.props.state.trigger()
  );
  instances.wallswitchFrontRight.up(
    async () => ((await all).props.main.props.setState.value = false)
  );
  instances.wallswitchFrontRight.longPress(async () =>
    (await allLights).props.flip.props.state.trigger()
  );

  properties.door.props.open.props.main.props.state.observe((value) => {
    if (!value) {
      if (!groups.ceilingLight.props.main.props.state.value) return;

      properties.entryDoorTimer.props.active.props.state.value = true;

      return;
    }

    properties.ceilingLightFront.props.main.props.setState.value = true;
  });

  groups.ceilingLight.props.main.props.setState.observe(
    () => (properties.entryDoorTimer.props.active.props.state.value = false),
    true
  );

  properties.entryDoorTimer.props.state.observe(() => {
    groups.ceilingLight.props.main.props.setState.value = false;
  });
})();

export const hallway = new Element({
  $: 'hallway' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
});
