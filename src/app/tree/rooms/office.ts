import { epochs } from '@mrpelz/modifiable-date';

import { makeCustomStringLogger } from '../../../lib/log.js';
import { ev1527ButtonX4 } from '../../../lib/tree/devices/ev1527-button.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { flipMain, getMain, setMain } from '../../../lib/tree/logic.js';
import { Level } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import { outputGrouping } from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { inputGrouping, window } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { ev1527Transport } from '../bridges.js';
import { properties as livingRoomProperties } from './living-room.js';

export const devices = {
  ceilingLight: sonoffBasic(
    'lighting',
    'livingroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  floodlight: obiPlug(
    'lighting',
    'mrpelzbedroom-floodlight.lan.wurstsalat.cloud',
    context,
  ),
  multiButton: ev1527ButtonX4(714_410, ev1527Transport, context),
  wallswitch: shellyi3('livingroom-wallswitch.lan.wurstsalat.cloud', context),
  windowSensor: ev1527WindowSensor(670_496, ev1527Transport, context),
};

export const instances = {
  floodlightButton: devices.floodlight.button,
  multiButton: devices.multiButton,
  wallswitchBottom: devices.wallswitch.button2,
  wallswitchMiddle: devices.wallswitch.button1,
  wallswitchTop: devices.wallswitch.button0,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  floodlight: devices.floodlight.relay,
  floodlightTimer: offTimer(context, epochs.hour, undefined),
  window: window(context, devices.windowSensor, 'security'),
};

export const groups = {
  allLights: outputGrouping(
    context,
    [properties.ceilingLight, properties.floodlight],
    'lighting',
  ),
  allWindows: inputGrouping(context, [properties.window], 'security'),
};

const $init: InitFunction = async (room, introspection) => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../scenes.js'
  );

  const {
    floodlightButton,
    multiButton,
    wallswitchBottom,
    wallswitchMiddle,
    wallswitchTop,
  } = instances;
  const { ceilingLight, floodlight, floodlightTimer } = properties;

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

  floodlightButton.state.up(() =>
    flipMain(floodlight, () =>
      l(
        `${p(floodlightButton)} ${floodlightButton.state.up.name} flipped ${p(floodlight)}`,
      ),
    ),
  );

  floodlightButton.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(floodlightButton)} ${floodlightButton.state.longPress.name}`,
    ),
  );

  multiButton.state.topLeft.observe(() =>
    flipMain(ceilingLight, () =>
      l(`${p(multiButton)} topLeft flipped ${p(ceilingLight)}`),
    ),
  );

  multiButton.state.topRight.observe(() =>
    flipMain(floodlight, () =>
      l(`${p(multiButton)} topRight flipped ${p(floodlight)}`),
    ),
  );

  multiButton.state.bottomLeft.observe(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(`${p(multiButton)} bottomLeft`),
  );

  multiButton.state.bottomRight.observe(() =>
    kitchenAdjecentsLightsOffKitchenBrightOn(`${p(multiButton)} bottomRight`),
  );

  wallswitchBottom.state.up(() =>
    flipMain(livingRoomProperties.standingLamp, () =>
      l(
        `${p(wallswitchBottom)} ${wallswitchBottom.state.up.name} flipped ${p(livingRoomProperties.standingLamp)}`,
      ),
    ),
  );

  wallswitchBottom.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchBottom)} ${wallswitchBottom.state.longPress.name}`,
    ),
  );

  wallswitchMiddle.state.up(() =>
    flipMain(floodlight, () =>
      l(
        `${p(wallswitchMiddle)} ${wallswitchMiddle.state.up.name} flipped ${p(floodlight)}`,
      ),
    ),
  );

  wallswitchMiddle.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenBrightOn(
      `${p(wallswitchMiddle)} ${wallswitchMiddle.state.longPress.name}`,
    ),
  );

  wallswitchTop.state.up(() =>
    flipMain(ceilingLight, () =>
      l(
        `${p(wallswitchTop)} ${wallswitchTop.state.up.name} flipped ${p(ceilingLight)}`,
      ),
    ),
  );

  wallswitchTop.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenBrightOn(
      `${p(wallswitchTop)} ${wallswitchTop.state.longPress.name}`,
    ),
  );

  floodlight.main.setState.observe((value, _observer, changed) => {
    if (changed) {
      l(
        `${p(floodlightTimer)} was ${value ? 'started' : 'stopped'} because ${p(floodlight)} was turned ${value ? 'on' : 'off'}`,
      );
    }

    floodlightTimer.state[value ? 'start' : 'stop']();
  }, true);

  floodlightTimer.state.observe(() =>
    setMain(floodlight, false, () =>
      l(
        `${p(floodlight)} was turned off because ${p(floodlightTimer)} ran out`,
      ),
    ),
  );
};

export const office = {
  $: 'office' as const,
  $init,
  devices: deviceMap(devices),
  level: Level.ROOM as const,
  ...groups,
  ...instances,
  ...properties,
};
