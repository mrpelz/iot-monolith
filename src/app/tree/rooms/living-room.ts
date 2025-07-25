import { epochs } from '../../../lib/epochs.js';
import { makeCustomStringLogger } from '../../../lib/log.js';
import { maxmin, round } from '../../../lib/number.js';
import { promiseGuard } from '../../../lib/promise.js';
import { BooleanState } from '../../../lib/state.js';
import { ev1527ButtonX4 } from '../../../lib/tree/devices/ev1527-button.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import {
  flipMain,
  getMain,
  setMain,
  triggerMain,
} from '../../../lib/tree/logic.js';
import {
  Level,
  markObjectKeysExcludedFromMatch,
} from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import {
  outputGrouping,
  scene,
  SceneMember,
  triggerElement,
} from '../../../lib/tree/properties/actuators.js';
import { offTimer } from '../../../lib/tree/properties/logic.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { every2Minutes } from '../../timings.js';
import { overriddenLed, sunlightLeds } from '../../util.js';
import { ev1527Transport } from '../bridges.js';
import { groups as hallwayGroups } from './hallway.js';

export const devices = {
  couchButton: ev1527ButtonX4(822_302, ev1527Transport, context),
  standingLamp: obiPlug(
    'lighting' as const,
    'livingroom-standinglamp.lan.wurstsalat.cloud',
    context,
  ),
  terrariumLeds: markObjectKeysExcludedFromMatch(
    // prevent automated leds from appearing in groups
    h801('office-workbenchleds.lan.wurstsalat.cloud', context),
    'ledB',
    'ledR',
  ),
  wallswitch: shellyi3('diningroom-wallswitch.lan.wurstsalat.cloud', context),
};

export const instances = {
  couchButton: devices.couchButton,
  standingLampButton: devices.standingLamp.button,
  wallswitchBottom: devices.wallswitch.button1,
  wallswitchTop: devices.wallswitch.button0,
};

const isTerrariumLedsOverride = new BooleanState(false);

export const properties = {
  overrideTimer: offTimer(context, epochs.hour * 12, true),
  standingLamp: devices.standingLamp.relay,
  terrariumLedRed: overriddenLed(
    context,
    devices.terrariumLeds.ledB,
    isTerrariumLedsOverride,
  ),
  terrariumLedTop: overriddenLed(
    context,
    devices.terrariumLeds.ledR,
    isTerrariumLedsOverride,
  ),
};

export const groups = {
  allLights: outputGrouping(
    context,
    [
      properties.standingLamp,
      properties.terrariumLedRed,
      properties.terrariumLedTop,
    ],
    'lighting',
  ),
};

export const scenes = {
  mediaOff: triggerElement(context, 'media'),
  mediaOnOrSwitch: triggerElement(context, 'media'),
  terrariumLedsOverride: scene(
    context,
    [new SceneMember(isTerrariumLedsOverride, true, false)],
    'automation',
  ),
};

const $init: InitFunction = async (room, introspection) => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } = await import(
    '../scenes.js'
  );

  const { couchButton, standingLampButton, wallswitchBottom, wallswitchTop } =
    instances;
  const { standingLamp, overrideTimer, terrariumLedRed, terrariumLedTop } =
    properties;
  const { mediaOnOrSwitch, mediaOff, terrariumLedsOverride } = scenes;

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

  couchButton.state.topLeft.observe(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(`${p(couchButton)} topLeft`),
  );

  couchButton.state.topRight.observe(() =>
    kitchenAdjecentsLightsOffKitchenBrightOn(`${p(couchButton)} topRight`),
  );

  couchButton.state.bottomLeft.observe(() =>
    triggerMain(mediaOnOrSwitch, () =>
      l(`${p(couchButton)} bottomLeft" triggered "${p(mediaOnOrSwitch)}`),
    ),
  );

  couchButton.state.bottomRight.observe(() =>
    triggerMain(mediaOff, () =>
      l(`${p(couchButton)} bottomRight" triggered "${p(mediaOff)}`),
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
    kitchenAdjecentsLightsOffKitchenBrightOn(
      `${p(standingLampButton)} ${standingLampButton.state.longPress.name}`,
    ),
  );

  wallswitchBottom.state.up(() =>
    flipMain(standingLamp, () =>
      l(
        `${p(wallswitchBottom)} ${wallswitchBottom.state.up.name} flipped ${p(standingLamp)}`,
      ),
    ),
  );

  wallswitchBottom.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(
      `${p(wallswitchBottom)} ${wallswitchBottom.state.longPress.name}`,
    ),
  );

  wallswitchTop.state.up(() =>
    flipMain(hallwayGroups.ceilingLight, () =>
      l(
        `${p(wallswitchTop)} ${wallswitchTop.state.up.name} flipped ${p(hallwayGroups.ceilingLight)}`,
      ),
    ),
  );

  wallswitchTop.state.longPress(() =>
    kitchenAdjecentsLightsOffKitchenBrightOn(
      `${p(wallswitchTop)} ${wallswitchTop.state.longPress.name}`,
    ),
  );

  const handleTerrariumLedsAutomation = () => {
    if (isTerrariumLedsOverride.value) {
      return;
    }

    const { terrariumLeds } = devices;

    const { red: red_, white: white_ } = sunlightLeds();

    const red = round(red_, 3);
    const white = round(white_, 3);

    const brightnessRed = red ? maxmin(red + 0.18) : 0;
    const brightnessWhite = white ? maxmin(white + 0.18) : 0;

    if (!getMain(terrariumLeds.device.online)) return;

    l(
      `for sun-elevation automation, set ${p(terrariumLedRed)} to ${JSON.stringify(brightnessRed)} and ${p(terrariumLedTop)} to ${JSON.stringify(brightnessWhite)}`,
    );

    terrariumLeds.ledB.brightness.setState.value = brightnessRed;
    terrariumLeds.ledR.brightness.setState.value = brightnessWhite;
  };

  isTerrariumLedsOverride.observe((value, _observer, changed) => {
    if (changed) {
      l(
        `${value ? 'started' : 'stopped'} timer ${p(overrideTimer)} because ${p(terrariumLedsOverride)} was set to ${JSON.stringify(value)}`,
      );
    }

    overrideTimer.state[value ? 'start' : 'stop']();

    if (!value) return;

    if (changed) {
      l(
        `set ${p(terrariumLedRed)} and ${p(terrariumLedTop)} off because ${p(terrariumLedsOverride)} was set to ${JSON.stringify(value)}`,
      );
    }

    setMain(devices.terrariumLeds.ledR, false);
    setMain(devices.terrariumLeds.ledB, false);
  });

  isTerrariumLedsOverride.observe(handleTerrariumLedsAutomation);
  every2Minutes.addTask(handleTerrariumLedsAutomation);
  devices.terrariumLeds.device.online.main.state.observe((isOnline) => {
    if (!isOnline) return;

    l(`${p(devices.terrariumLeds)} is back online, running automation`);

    handleTerrariumLedsAutomation();
  });

  overrideTimer.state.observe(() => {
    l(
      `${p(terrariumLedsOverride)} was set false because ${p(overrideTimer)} ran out`,
    );

    isTerrariumLedsOverride.value = false;
  });

  mediaOff.state.observe(async () => {
    const url = 'http://node-red.lan.wurstsalat.cloud:1880/media/off';

    l(`${url} was sent because ${p(mediaOff)} was triggered`);

    await promiseGuard(
      fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(1000),
      }),
    );

    l(
      `${p(terrariumLedsOverride)} was set false because ${p(mediaOff)} was triggered`,
    );

    isTerrariumLedsOverride.value = false;
  });

  mediaOnOrSwitch.state.observe(async () => {
    const url = 'http://node-red.lan.wurstsalat.cloud:1880/media/on-or-switch';

    l(`${url} was sent because ${p(mediaOnOrSwitch)} was triggered`);

    await promiseGuard(
      fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(1000),
      }),
    );

    l(
      `${p(terrariumLedsOverride)} was set true because ${p(mediaOnOrSwitch)} was triggered`,
    );

    isTerrariumLedsOverride.value = true;
  });
};

export const livingRoom = {
  $: 'livingRoom' as const,
  $init,
  devices: deviceMap(devices),
  level: Level.ROOM as const,
  ...groups,
  ...instances,
  ...properties,
  ...scenes,
};
