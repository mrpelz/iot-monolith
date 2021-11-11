/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../../lib/tree/main.js';
import { epochs } from '../../lib/epochs.js';
import { ev1527Transport } from '../bridges.js';
import { ev1527WindowSensor } from '../../lib/tree/devices/ev1527-window-sensor.js';
import { logger } from '../logging.js';
import { offTimer } from '../../lib/tree/properties/logic.js';
import { outputGrouping } from '../../lib/tree/properties/actuators.js';
import { shelly1 } from '../../lib/tree/devices/shelly1.js';
import { shellyi3 } from '../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../lib/tree/devices/sonoff-basic.js';
import { timings } from '../timings.js';

export const devices = {
  ceilingLightBack: sonoffBasic(
    logger,
    timings,
    'hallway-ceilinglightback.iot.wurstsalat.cloud'
  ),
  ceilingLightFront: shelly1(
    logger,
    timings,
    'hallway-ceilinglightfront.iot.wurstsalat.cloud'
  ),
  doorSensor: ev1527WindowSensor(logger, ev1527Transport, 55024),
  wallswitchBack: shellyi3(
    logger,
    timings,
    'hallway-wallswitchback.iot.wurstsalat.cloud'
  ),
  wallswitchFront: shellyi3(
    logger,
    timings,
    'hallway-wallswitchfront.iot.wurstsalat.cloud'
  ),
  wallswitchMiddle: shellyi3(
    logger,
    timings,
    'hallway-wallswitchmiddle.iot.wurstsalat.cloud'
  ),
};

export const instances = {
  wallswitchBack: devices.wallswitchBack.button0.$,
  wallswitchFrontLeft: devices.wallswitchFront.button0.$,
  wallswitchFrontMiddle: devices.wallswitchFront.button1.$,
  wallswitchFrontRight: devices.wallswitchFront.button2.$,
  wallswitchMiddle: devices.wallswitchMiddle.button0.$,
};

const partialProperties = {
  ceilingLightBack: devices.ceilingLightBack.relay,
  ceilingLightFront: devices.ceilingLightFront.relay,
  doorOpen: devices.doorSensor.open,
  doorSensorTampered: devices.doorSensor.tamperSwitch,
};

export const groups = {
  allLights: outputGrouping([
    partialProperties.ceilingLightBack,
    partialProperties.ceilingLightFront,
  ]),
  ceilingLight: outputGrouping([
    partialProperties.ceilingLightBack,
    partialProperties.ceilingLightFront,
  ]),
};

export const properties = {
  ...partialProperties,
  lightTimer: offTimer(epochs.minute * 3, groups.ceilingLight._set, false),
};

(async () => {
  const { allLights } = await import('../groups.js');

  instances.wallswitchBack.up(() => groups.ceilingLight._set.flip());

  instances.wallswitchMiddle.up(() => groups.ceilingLight._set.flip());

  instances.wallswitchFrontLeft.up(() =>
    properties.ceilingLightFront._set.flip()
  );
  instances.wallswitchFrontMiddle.up(() => allLights._set.flip());
  instances.wallswitchFrontRight.up(() =>
    properties.ceilingLightBack._set.flip()
  );

  properties.doorOpen._get.observe((value) => {
    if (!value || properties.ceilingLightFront._get.value) return;

    properties.lightTimer._set.value = true;
    properties.ceilingLightFront._set.value = true;
  });

  properties.lightTimer.active._get.observe((value) => {
    if (value) return;
    properties.lightTimer._set.value = false;
  });
})();

export const hallway = {
  ...groups,
  ...properties,
  devices,
};

metadataStore.set(hallway, {
  isConnectingRoom: true,
  level: Levels.ROOM,
  name: 'hallway',
});