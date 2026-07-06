import { safeAsync } from '@mrpelz/misc-utils/async';
import { maxmin, round } from '@mrpelz/misc-utils/number';
import { epochs } from '@mrpelz/modifiable-date';
import { BooleanState } from '@mrpelz/observable/state';
import pjlink from 'pjlink-control';

import {
  ExternalStateScheduled,
  ExternalStateSettable,
  ExternalStateSettableScheduled,
} from '../../../lib/items/external-state.js';
import { makeCustomStringLogger } from '../../../lib/log.js';
import { DelimitedStream, TCPClient } from '../../../lib/tcp-client.js';
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
  ValueType,
} from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import {
  externalStateSettable,
  outputGrouping,
  scene,
  SceneMember,
  triggerElement,
} from '../../../lib/tree/properties/actuators.js';
import { timer } from '../../../lib/tree/properties/logic.js';
import { externalStateScheduled } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { pjlinkPassword } from '../../environment.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { every5Seconds, every30Seconds } from '../../timings.js';
import { overriddenLed, sunlightLeds } from '../../util.js';
import { ev1527Transport } from '../bridges.js';

const AVR_DEBUG_CONNECT = false;
const PJLINK_DEBUG_CONNECT = false;

const INFOSCREEN_BASE_URL = 'http://infoscreen.lan.wurstsalat.cloud:8080';

type Projector = pjlink.default;
const Projector = pjlink.default;

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

const avrSocket = new TCPClient('bender.lan.wurstsalat.cloud', 23);

let pjlinkProjector: Projector | undefined;

const isTerrariumLedsOverride = new BooleanState(false);

export const properties = {
  avr: {
    $: 'avr' as const,
    power: externalStateSettable(
      context,
      ValueType.BOOLEAN,
      new ExternalStateSettable(
        false,
        async (value, actualValue) => {
          if (!avrSocket.writable) return;
          if (value === actualValue) return;

          avrSocket.write(value ? 'ZMON\r' : 'ZMOFF\r', 'ascii');
        },
        every30Seconds,
      ),
      'output',
      'media',
    ),
  },
  ceilingLight: devices.ceilingLight.relay,
  infoscreen: {
    $: 'infoscreen' as const,
    masked: externalStateScheduled(
      context,
      ValueType.BOOLEAN,
      new ExternalStateScheduled(async () => {
        const [error0, response] = await safeAsync(
          fetch(new URL('/isMasked', INFOSCREEN_BASE_URL), {
            signal: AbortSignal.timeout(epochs.second),
          }),
        );
        if (error0) return ExternalStateScheduled.doNotSet;

        const [error1, isMasked] = await safeAsync(
          response.json() as Promise<boolean>,
        );
        if (error1) return ExternalStateScheduled.doNotSet;

        return isMasked;
      }, every5Seconds),
      'masked',
      'media',
    ),
    on: externalStateSettable(
      context,
      ValueType.BOOLEAN,
      new ExternalStateSettableScheduled(
        false,
        async () => {
          const [error0, response] = await safeAsync(
            fetch(new URL('/isOn', INFOSCREEN_BASE_URL), {
              signal: AbortSignal.timeout(epochs.second),
            }),
          );
          if (error0) return ExternalStateSettableScheduled.doNotSet;

          const [error1, isOn] = await safeAsync(
            response.json() as Promise<boolean>,
          );
          if (error1) return ExternalStateSettableScheduled.doNotSet;

          return isOn;
        },
        async (value, actualValue) => {
          if (value === actualValue) return;

          await safeAsync(
            fetch(new URL(value ? '/on' : '/off', INFOSCREEN_BASE_URL), {
              method: 'POST',
              signal: AbortSignal.timeout(epochs.second),
            }),
          );
        },
        every5Seconds,
        every30Seconds,
      ),
      'output',
      'media',
    ),
  },
  overrideTimer: timer(context, epochs.hour * 3, true),
  projector: {
    $: 'projector' as const,
    power: externalStateSettable(
      context,
      ValueType.BOOLEAN,
      new ExternalStateSettableScheduled(
        false,
        async () => {
          if (!pjlinkProjector) return ExternalStateScheduled.doNotSet;

          const power = await pjlinkProjector.getPower();

          switch (power) {
            case 'cooling':
            case 'off': {
              return false;
            }
            case 'on':
            case 'warm-up': {
              return true;
            }
            default: {
              return null;
            }
          }
        },
        async (value, actualValue) => {
          if (value === actualValue) return;

          pjlinkProjector?.power(value ? 'on' : 'off');
        },
        every5Seconds,
        every30Seconds,
      ),
      'output',
      'media',
    ),
    state: externalStateScheduled(
      context,
      ValueType.STRING,
      new ExternalStateScheduled<'on' | 'off' | 'cooling' | 'warm-up'>(
        async () => {
          if (!pjlinkProjector) return ExternalStateScheduled.doNotSet;

          return pjlinkProjector.getPower();
        },
        every5Seconds,
      ),
      'state',
      'media',
    ),
  },
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

const $init: InitFunction = async (room, introspection) => {
  const { kitchenAdjacentLights } = await import('../groups.js');
  const { kitchenAdjacentBright, kitchenAdjacentChillax } =
    await import('../scenes.js');

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
    avr,
    ceilingLight,
    infoscreen,
    overrideTimer,
    projector,
    standingLamp,
    terrariumLedRed,
    terrariumLedTop,
  } = properties;
  const { mediaOn, mediaOff, terrariumLedsOverride } = scenes;

  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

  if (context.connect || AVR_DEBUG_CONNECT) {
    avrSocket.connect();
  }

  avrSocket.on('connect', () => l('avr connected'));
  avrSocket.on('close', () => l('avr disconnected'));
  every5Seconds.addTask(() => {
    if (!avrSocket.writable) return;
    avrSocket.write('ZM?\r', 'ascii');
  });

  avrSocket
    .pipe(new DelimitedStream(Buffer.from('\r')))
    .on('data', (data: Buffer) => {
      const line = data.toString('ascii');

      if (line === 'ZMON') {
        avr.power.state.inject(true);
      } else if (line === 'ZMOFF') {
        avr.power.state.inject(false);
      }
    });

  pjlinkProjector =
    (context.connect || PJLINK_DEBUG_CONNECT) && pjlinkPassword
      ? new Projector('beamer.lan.wurstsalat.cloud', pjlinkPassword)
      : undefined;

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
    l(`${p(avr.power)} was set false because ${p(mediaOff)} was triggered`);
    avr.power.state.setState.value = false;

    l(`${p(infoscreen.on)} was set true because ${p(mediaOff)} was triggered`);
    infoscreen.on.state.setState.value = true;

    l(
      `${p(projector.power)} was set false because ${p(mediaOff)} was triggered`,
    );
    projector.power.state.setState.value = false;

    l(
      `${p(terrariumLedsOverride)} was set false because ${p(mediaOff)} was triggered`,
    );
    isTerrariumLedsOverride.value = false;
  });

  mediaOn.state.observe(async () => {
    l(`${p(avr.power)} was set true because ${p(mediaOn)} was triggered`);
    avr.power.state.setState.value = true;

    l(`${p(infoscreen.on)} was set false because ${p(mediaOn)} was triggered`);
    infoscreen.on.state.setState.value = false;

    l(`${p(projector.power)} was set true because ${p(mediaOn)} was triggered`);
    projector.power.state.setState.value = true;

    l(
      `${p(terrariumLedsOverride)} was set true because ${p(mediaOn)} was triggered`,
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
