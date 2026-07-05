import { Socket } from 'node:net';
import { createInterface } from 'node:readline/promises';

import { safeAsync } from '@mrpelz/misc-utils/async';
import { maxmin, round } from '@mrpelz/misc-utils/number';
import { sleep } from '@mrpelz/misc-utils/sleep';
import { epochs } from '@mrpelz/modifiable-date';
import { BooleanState } from '@mrpelz/observable/state';
import pjlink from 'pjlink-control';

import { makeCustomStringLogger } from '../../../lib/log.js';
import { ev1527ButtonX4 } from '../../../lib/tree/devices/ev1527-button.js';
import { h801Ng } from '../../../lib/tree/devices/h801.js';
import { obiPlug } from '../../../lib/tree/devices/obi-plug.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { shelly1 } from '../../../lib/tree/devices/shelly1.js';
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
import { timer } from '../../../lib/tree/properties/logic.js';
import { context } from '../../context.js';
import { pjlinkPassword } from '../../environment.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { every30Seconds } from '../../timings.js';
import { overriddenLed, sunlightLeds } from '../../util.js';
import { ev1527Transport } from '../bridges.js';

const { default: Projector } = pjlink;

export const devices = {
  ceilingLight: shelly1(
    'lighting' as const,
    'livingroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  couchButton: ev1527ButtonX4(822_302, ev1527Transport, context),
  standingLamp: obiPlug(
    'lighting' as const,
    'livingroom-standinglamp.lan.wurstsalat.cloud',
    context,
  ),
  terrariumLeds: markObjectKeysExcludedFromMatch(
    // prevent automated leds from appearing in groups
    h801Ng('livingroom-terrariumleds.lan.wurstsalat.cloud', context),
    'ledB',
    'ledR',
  ),
  wallswitch: shellyi3('livingroom-wallswitch.lan.wurstsalat.cloud', context),
};

export const instances = {
  couchButtonBottomLeft: devices.couchButton.bottomLeft,
  couchButtonBottomRight: devices.couchButton.bottomRight,
  couchButtonTopLeft: devices.couchButton.topLeft,
  couchButtonTopRight: devices.couchButton.topRight,
  standingLampButton: devices.standingLamp.button,
  wallswitchBottom: devices.wallswitch.button1,
  wallswitchTop: devices.wallswitch.button0,
};

const isTerrariumLedsOverride = new BooleanState(false);

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  overrideTimer: timer(context, epochs.hour * 3, true),
  standingLamp: devices.standingLamp.relay,
  terrariumLedRed: overriddenLed(
    devices.terrariumLeds.ledB,
    isTerrariumLedsOverride,
  ),
  terrariumLedTop: overriddenLed(
    devices.terrariumLeds.ledR,
    isTerrariumLedsOverride,
  ),
};

export const groups = {
  allLights: outputGrouping(
    context,
    [
      properties.ceilingLight,
      properties.standingLamp,
      properties.terrariumLedRed,
      properties.terrariumLedTop,
    ],
    'lighting',
  ),
};

export const scenes = {
  mediaOff: triggerElement(context, 'media'),
  mediaOn: triggerElement(context, 'media'),
  terrariumLedsOverride: scene(
    context,
    [new SceneMember(isTerrariumLedsOverride, true, false)],
    'automation',
  ),
};

const askAVR = (command: string) => {
  const { promise, resolve } = Promise.withResolvers<string>();

  const socket = new Socket({ noDelay: true });
  const readline = createInterface({ input: socket, output: socket });
  socket.connect(23, 'bender.lan.wurstsalat.cloud', async () => {
    const response = await readline.question(command);

    socket.end();
    socket.destroy();

    resolve(response);
  });

  return Promise.race([promise, sleep(epochs.second * 5)]);
};

const infoScreenOff = () =>
  fetch('http://infoscreen.lan.wurstsalat.cloud:8080/off', {
    method: 'POST',
    signal: AbortSignal.timeout(epochs.second),
  });

const $init: InitFunction = async (room, introspection) => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } =
    await import('../scenes.js');
  const { instances: hallwayInstances } = await import('../rooms/hallway.js');

  const {
    couchButtonBottomLeft,
    couchButtonBottomRight,
    couchButtonTopLeft,
    couchButtonTopRight,
    standingLampButton,
    wallswitchBottom,
    wallswitchTop,
  } = instances;
  const {
    ceilingLight,
    standingLamp,
    overrideTimer,
    terrariumLedRed,
    terrariumLedTop,
  } = properties;
  const { mediaOn, mediaOff, terrariumLedsOverride } = scenes;

  const { wallswitchFrontRight: hallwayWallswitchFrontRight } =
    hallwayInstances;

  const projector = pjlinkPassword
    ? new Projector('beamer.lan.wurstsalat.cloud', pjlinkPassword)
    : undefined;

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

  couchButtonTopLeft.state.observe(() =>
    kitchenAdjecentsLightsOffKitchenChillaxOn(`${p(couchButtonTopLeft)}`),
  );

  couchButtonTopRight.state.observe(() =>
    kitchenAdjecentsLightsOffKitchenBrightOn(`${p(couchButtonTopRight)}`),
  );

  couchButtonBottomLeft.state.observe(() =>
    triggerMain(mediaOn, () =>
      l(`${p(couchButtonBottomLeft)} triggered ${p(mediaOn)}`),
    ),
  );

  couchButtonBottomRight.state.observe(() =>
    triggerMain(mediaOff, () =>
      l(`${p(couchButtonBottomRight)} bottomRight triggered ${p(mediaOff)}`),
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

    terrariumLedRed.automated.led.brightness.setState.value = brightnessRed;
    terrariumLedTop.automated.led.brightness.setState.value = brightnessWhite;
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

    setMain(terrariumLedRed.automated.led, false);
    setMain(terrariumLedTop.automated.led, false);
  });

  isTerrariumLedsOverride.observe(handleTerrariumLedsAutomation);
  every30Seconds.addTask(handleTerrariumLedsAutomation);
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
    await safeAsync(
      Promise.allSettled([
        projector?.power('off'),
        (async () => {
          const isAVROff = (await askAVR('ZM?')) === 'ZMOFF';
          if (!isAVROff) {
            await askAVR('ZMOFF');
          }
        })(),
        fetch('http://infoscreen.lan.wurstsalat.cloud:8080/on', {
          method: 'POST',
          signal: AbortSignal.timeout(epochs.second),
        }),
      ]),
    );

    l(
      `${p(terrariumLedsOverride)} was set false because ${p(mediaOff)} was triggered`,
    );

    isTerrariumLedsOverride.value = false;
  });

  mediaOn.state.observe(async () => {
    await safeAsync(
      Promise.allSettled([
        projector?.power('on'),
        (async () => {
          const isAVROn = (await askAVR('ZM?')) === 'ZMON';
          if (!isAVROn) {
            await askAVR('ZMON');
          }
        })(),
        infoScreenOff(),
      ]),
    );

    l(
      `${p(terrariumLedsOverride)} was set true because ${p(mediaOn)} was triggered`,
    );

    isTerrariumLedsOverride.value = true;
  });

  hallwayWallswitchFrontRight.state.up(async () => {
    await safeAsync(
      Promise.allSettled([
        projector?.power('off'),
        (async () => {
          const isAVROff = (await askAVR('ZM?')) === 'ZMOFF';
          if (!isAVROff) {
            await askAVR('ZMOFF');
          }
        })(),
        infoScreenOff(),
      ]),
    );
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
