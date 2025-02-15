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
import { context } from '../../context.js';
import { persistence } from '../../persistence.js';
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
  entryDoor: door(devices.doorSensor),
};

export const properties = {
  entryDoorTimer: offTimer(epochs.minute * 3, undefined, persistence),
  ...partialProperties,
};

export const groups = {
  allLights: outputGrouping(
    [properties.ceilingLightBack, properties.ceilingLightFront],
    'lighting',
  ),
  ceilingLight: outputGrouping(
    [properties.ceilingLightBack, properties.ceilingLightFront],
    'lighting',
  ),
};

(async () => {
  const {
    all: all_,
    allLights: allLights_,
    kitchenAdjacentLights,
  } = await import('../groups.js');
  const { kitchenAdjacentChillax } = await import('../scenes.js');

  const all = await all_;
  const allLights = await allLights_;

  const kitchenAdjecentsLightsOffKitchenChillaxOn = () => {
    if (kitchenAdjacentLights.main.setState.value) {
      kitchenAdjacentLights.main.setState.value = false;
      return;
    }

    kitchenAdjacentChillax.main.setState.value = true;
  };

  instances.wallswitchBack.up(() =>
    groups.ceilingLight.flip.setState.trigger(),
  );
  instances.wallswitchBack.longPress(kitchenAdjecentsLightsOffKitchenChillaxOn);

  instances.wallswitchMiddle.up(() =>
    groups.ceilingLight.flip.setState.trigger(),
  );

  instances.wallswitchFrontLeft.up(() =>
    properties.ceilingLightFront.flip.setState.trigger(),
  );
  instances.wallswitchFrontLeft.longPress(
    kitchenAdjecentsLightsOffKitchenChillaxOn,
  );

  instances.wallswitchFrontMiddle.up(() =>
    properties.ceilingLightBack.flip.setState.trigger(),
  );
  instances.wallswitchFrontMiddle.longPress(
    kitchenAdjecentsLightsOffKitchenChillaxOn,
  );

  instances.wallswitchFrontRight.up(async () => {
    all.main.setState.value = false;
  });
  instances.wallswitchFrontRight.longPress(async () => {
    allLights.flip.setState.trigger();
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
  level: Level.ROOM as const,
  ...deviceMap(devices),
  ...groups,
  ...properties,
};
