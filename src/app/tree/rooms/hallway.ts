import { epochs } from '../../../lib/epochs.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { Level } from '../../../lib/tree/main.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { door } from '../../../lib/tree/properties/sensors.js';
import { logger } from '../../logging.js';
import { persistence } from '../../persistence.js';
import { timings } from '../../timings.js';
import { ev1527Transport } from '../../tree/bridges.js';

export const devices = {
  ceilingLightBack: sonoffBasic(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'hallway-ceilinglightback.lan.wurstsalat.cloud',
  ),
  ceilingLightFront: shelly1(
    logger,
    persistence,
    timings,
    'lighting' as const,
    'hallway-ceilinglightfront.lan.wurstsalat.cloud',
  ),
  doorSensor: ev1527WindowSensor(logger, persistence, ev1527Transport, 55_024),
  wallswitchBack: shellyi3(
    logger,
    persistence,
    timings,
    'hallway-wallswitchback.lan.wurstsalat.cloud',
  ),
  wallswitchFront: shellyi3(
    logger,
    persistence,
    timings,
    'hallway-wallswitchfront.lan.wurstsalat.cloud',
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
  entryDoor: door(devices.doorSensor),
};

export const groups = {
  allLights: outputGrouping([
    partialProperties.ceilingLightBack,
    partialProperties.ceilingLightFront,
  ]),
  ceilingLight: outputGrouping(
    [partialProperties.ceilingLightBack, partialProperties.ceilingLightFront],
    'lighting',
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
    groups.ceilingLight.flip.setState.trigger(),
  );

  instances.wallswitchMiddle.up(() =>
    groups.ceilingLight.flip.setState.trigger(),
  );

  instances.wallswitchFrontLeft.up(() =>
    properties.ceilingLightFront.flip.setState.trigger(),
  );
  instances.wallswitchFrontMiddle.up(() =>
    properties.ceilingLightBack.flip.setState.trigger(),
  );
  instances.wallswitchFrontRight.up(async () => {
    const all_ = await all;
    all_.main.setState.value = false;
  });
  instances.wallswitchFrontRight.longPress(async () => {
    const allLights_ = await allLights;
    allLights_.flip.setState.trigger();
  });

  properties.entryDoor.open.main.state.observe((value) => {
    if (!value) {
      if (!groups.ceilingLight.main.state.value) return;

      properties.entryDoorTimer.active.state.value = true;

      return;
    }

    properties.ceilingLightFront.main.setState.value = true;
  });

  groups.ceilingLight.main.setState.observe(
    () => (properties.entryDoorTimer.active.state.value = false),
    true,
  );

  properties.entryDoorTimer.state.observe(() => {
    groups.ceilingLight.main.setState.value = false;
  });
})();

export const hallway = {
  $: 'hallway' as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
  level: Level.ROOM as const,
};
