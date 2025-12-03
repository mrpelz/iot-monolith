import { makeCustomStringLogger } from '../../../lib/log.js';
import { ev1527ButtonX1 } from '../../../lib/tree/devices/ev1527-button.js';
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
import {
  door,
  inputGrouping,
  window,
} from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { ev1527Transport } from '../bridges.js';

export const devices = {
  button: ev1527ButtonX1(4448, ev1527Transport, context),
  ceilingLight: sonoffBasic(
    'lighting' as const,
    'tsiabedroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  doorSensor: ev1527WindowSensor(55_696, ev1527Transport, context),
  nightLight: sonoffBasic(
    'lighting' as const,
    'mrpelzbedroom-nightlight.lan.wurstsalat.cloud',
    context,
  ),
  standingLamp: obiPlug(
    'lighting' as const,
    'tsiabedroom-standinglamp.lan.wurstsalat.cloud',
    context,
  ),
  wallswitch: shellyi3('tsiabedroom-wallswitch.lan.wurstsalat.cloud', context),
  windowSensorRight: ev1527WindowSensor(839_280, ev1527Transport, context),
};

export const instances = {
  button: devices.button.state,
  nightLightButton: devices.nightLight.button,
  standingLampButton: devices.standingLamp.button,
  wallswitchLeft: devices.wallswitch.button0,
  wallswitchMiddle: devices.wallswitch.button1,
  wallswitchRight: devices.wallswitch.button2,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  door: door(context, devices.doorSensor, undefined),
  nightLight: devices.nightLight.relay,
  standingLamp: devices.standingLamp.relay,
  windowRight: window(context, devices.windowSensorRight, 'security'),
};

export const groups = {
  allLights: outputGrouping(
    context,
    [properties.ceilingLight, properties.nightLight, properties.standingLamp],
    'lighting',
  ),
  allWindows: inputGrouping(context, [properties.windowRight], 'security'),
};

const $init: InitFunction = (room, introspection) => {
  const { allLights } = groups;
  const {
    button,
    nightLightButton,
    standingLampButton,
    wallswitchLeft,
    wallswitchMiddle,
    wallswitchRight,
  } = instances;
  const { ceilingLight, nightLight, standingLamp } = properties;

  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

  button.one.observe(() => {
    if (getMain(allLights)) {
      setMain(allLights, false, () =>
        l(
          `${p(button)} turned off ${p(allLights)}, because ${p(allLights)} was on`,
        ),
      );

      return;
    }

    flipMain(nightLight, () =>
      l(
        `${p(button)} flipped ${p(nightLight)}, because ${p(allLights)} was off`,
      ),
    );
  });

  nightLightButton.state.up(() =>
    flipMain(nightLight, () =>
      l(
        `${p(nightLightButton)} ${nightLightButton.state.up.name} flipped ${p(nightLight)}`,
      ),
    ),
  );

  nightLightButton.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(nightLightButton)} ${nightLightButton.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  standingLampButton.state.up(() =>
    flipMain(standingLamp, () =>
      l(
        `${p(standingLampButton)} ${standingLampButton.state.up.name} flipped ${p(standingLamp)}`,
      ),
    ),
  );

  standingLampButton.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(standingLampButton)} ${standingLampButton.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  wallswitchLeft.state.up(() =>
    flipMain(ceilingLight, () =>
      l(
        `${p(wallswitchLeft)} ${wallswitchLeft.state.up.name} flipped ${p(ceilingLight)}`,
      ),
    ),
  );

  wallswitchLeft.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(wallswitchLeft)} ${wallswitchLeft.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  wallswitchMiddle.state.up(() =>
    flipMain(standingLamp, () =>
      l(
        `${p(wallswitchMiddle)} ${wallswitchMiddle.state.up.name} flipped ${p(standingLamp)}`,
      ),
    ),
  );

  wallswitchMiddle.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(wallswitchMiddle)} ${wallswitchMiddle.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );

  wallswitchRight.state.up(() =>
    flipMain(nightLight, () =>
      l(
        `${p(wallswitchRight)} ${wallswitchRight.state.up.name} flipped ${p(nightLight)}`,
      ),
    ),
  );

  wallswitchRight.state.longPress(() =>
    setMain(allLights, false, () =>
      l(
        `${p(wallswitchRight)} ${wallswitchRight.state.longPress.name} turned off ${p(allLights)}`,
      ),
    ),
  );
};

export const tsiaBedroom = {
  $: 'tsiaBedroom' as const,
  $init,
  devices: deviceMap(devices),
  level: Level.ROOM as const,
  ...groups,
  ...instances,
  ...properties,
};
