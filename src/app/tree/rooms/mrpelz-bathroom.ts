import { sleep } from '@mrpelz/misc-utils/sleep';
import { epochs } from '@mrpelz/modifiable-date';
import { BooleanState } from '@mrpelz/observable/state';

import { makeCustomStringLogger } from '../../../lib/log.js';
import { ev1527ButtonX1 } from '../../../lib/tree/devices/ev1527-button.js';
import { ev1527WindowSensor } from '../../../lib/tree/devices/ev1527-window-sensor.js';
import { h801 } from '../../../lib/tree/devices/h801.js';
import { shellyi3 } from '../../../lib/tree/devices/shelly-i3.js';
import { shelly1WithInput } from '../../../lib/tree/devices/shelly1.js';
import { sonoffBasic } from '../../../lib/tree/devices/sonoff-basic.js';
import { deviceMap } from '../../../lib/tree/elements/device.js';
import { setter } from '../../../lib/tree/elements/setter.js';
import { flipMain, setMain } from '../../../lib/tree/logic.js';
import { Level, ValueType } from '../../../lib/tree/main.js';
import { InitFunction } from '../../../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../../../lib/tree/operations/introspection.js';
import {
  outputGrouping,
  scene,
  SceneMember,
  triggerElement,
} from '../../../lib/tree/properties/actuators.js';
import { timer } from '../../../lib/tree/properties/logic.js';
import { door } from '../../../lib/tree/properties/sensors.js';
import { context } from '../../context.js';
import { logger, logicReasoningLevel } from '../../logging.js';
import { persistence } from '../../persistence.js';
import {
  isAstronomicalTwilight,
  isCivilTwilight,
  isNauticalTwilight,
  isNight,
  manualInputLogic,
  sunElevation,
} from '../../util.js';
import { ev1527Transport } from '../bridges.js';

export const devices = {
  ceilingLight: shelly1WithInput(
    'lighting' as const,
    'mrpelzbathroom-ceilinglight.lan.wurstsalat.cloud',
    context,
  ),
  doorSensor: ev1527WindowSensor(720_256, ev1527Transport, context),
  leds: h801('mrpelzbathroom-leds.lan.wurstsalat.cloud', context),
  mirrorHeating: sonoffBasic(
    'heating' as const,
    'mrpelzbathroom-mirrorheating.lan.wurstsalat.cloud',
    context,
  ),
  mirrorLight: sonoffBasic(
    'lighting' as const,
    'mrpelzbathroom-mirrorlight.lan.wurstsalat.cloud',
    context,
  ),
  nightLight: sonoffBasic(
    'lighting' as const,
    'mrpelzbathroom-nightlight.lan.wurstsalat.cloud',
    context,
  ),
  showerButton: ev1527ButtonX1(628_217, ev1527Transport, context),
  wallswitchDoor: shellyi3(
    'mrpelzbathroom-wallswitchdoor.lan.wurstsalat.cloud',
    context,
  ),
};

export const instances = {
  mirrorHeatingButton: devices.mirrorHeating.button,
  mirrorLightButton: devices.mirrorLight.button,
  nightLightButton: devices.nightLight.button,
  showerButton: devices.showerButton.button,
  wallswitchDoor: devices.wallswitchDoor.button0,
  wallswitchMirrorBottom: devices.wallswitchDoor.button2,
  wallswitchMirrorTop: devices.wallswitchDoor.button1,
};

export const properties = {
  ceilingLight: devices.ceilingLight.relay,
  door: door(context, devices.doorSensor, undefined),
  mirrorHeating: devices.mirrorHeating.relay,
  mirrorHeatingTimer: timer(context, epochs.minute * 15, true),
  mirrorLed: devices.leds.ledR,
  mirrorLight: devices.mirrorLight.relay,
  motion: devices.ceilingLight.input,
  nightLight: devices.nightLight.relay,
};

export const groups = {
  allLights: outputGrouping(
    context,
    [
      properties.ceilingLight,
      properties.mirrorLed,
      properties.mirrorLight,
      properties.nightLight,
    ],
    'lighting',
  ),
  allThings: outputGrouping(
    context,
    [
      properties.ceilingLight,
      properties.mirrorHeating,
      properties.mirrorLed,
      properties.mirrorLight,
      properties.nightLight,
    ],
    undefined,
  ),
};

const scenesPartial = {
  astronomicalTwilightLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, false),
      new SceneMember(properties.nightLight.main.setState, true, false),
    ],
    'light',
  ),
  civilTwilightLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, true, false),
      new SceneMember(properties.nightLight.main.setState, true, false),
    ],
    'light',
  ),
  dayLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, true, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, true, false),
      new SceneMember(properties.nightLight.main.setState, false),
    ],
    'light',
  ),
  nauticalTwilightLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.brightness.setState, 1, 0),
      new SceneMember(properties.mirrorLight.main.setState, true, false),
      new SceneMember(properties.nightLight.main.setState, false),
    ],
    'light',
  ),
  nightLighting: scene(
    context,
    [
      new SceneMember(properties.ceilingLight.main.setState, false),
      new SceneMember(properties.mirrorLed.main.setState, false),
      new SceneMember(properties.mirrorLight.main.setState, false),
      new SceneMember(properties.nightLight.main.setState, true, false),
    ],
    'light',
  ),
};

export const scenes = {
  autoLight: triggerElement(context, 'light'),
  ...scenesPartial,
};

export const logic = {
  autoLightLogic: (() => {
    const $ = 'automatedInputLogic' as const;

    const { allLights: output } = groups;
    const { autoLight } = scenes;
    const inputsAutomated = [properties.door, properties.motion];
    const inputsManual = [
      instances.showerButton,
      instances.wallswitchDoor,
      instances.wallswitchMirrorBottom,
    ];

    const automationEnableState = new BooleanState(true);
    const automationEnable = setter(ValueType.BOOLEAN, automationEnableState);

    const timerOutput = timer(context, epochs.minute * 3);
    const timerAutomation = timer(context, epochs.minute * 10);

    const $init: InitFunction = async (object, introspection) => {
      let upstart = true;
      sleep(5000).then(() => (upstart = false));

      let outputSetterSourceIsTimerRunningOut = false;

      const parent = introspection.getObject(object)?.mainReference?.parent;
      const p = makePathStringRetriever(introspection);
      const l = makeCustomStringLogger(
        logger.getInput({
          head: p(parent ?? object),
        }),
        logicReasoningLevel,
      );

      const automationEnablePath = p(automationEnable);
      if (automationEnablePath) {
        persistence.observe(automationEnablePath, automationEnableState);
      }

      output.main.setState.observe((value) => {
        if (value) return;

        if (
          !upstart &&
          !outputSetterSourceIsTimerRunningOut &&
          automationEnableState.value
        ) {
          l(
            `${p(output)} was turned off from source that is not ${p(timerOutput)} and automation is active, disabling ${p(automationEnable)}`,
          );
          automationEnableState.value = false;
        }

        outputSetterSourceIsTimerRunningOut = false;

        if (timerOutput.state.isActive.value) {
          l(
            `${p(output)} was turned off with timer running, stopping ${p(timerOutput)}`,
          );
          timerOutput.state.stop();
        }
      }, true);

      for (const input of inputsAutomated) {
        let prime = false;

        const fn = (value: boolean | null) => {
          l(`${p(input)} turned ${JSON.stringify(value)}…`);

          if (!automationEnableState.value) {
            l(
              `${p(input)} turned ${JSON.stringify(value)} and ${p(automationEnable)} is false, not doing anything`,
            );

            return;
          }

          if (value) {
            if (!output.main.setState.value) {
              l(
                `${p(input)} turned true with output off, triggering ${p(autoLight)} and priming`,
              );

              prime = true;
              autoLight.state.trigger();
            }

            return;
          }

          if (!prime) {
            if (
              output.main.setState.value &&
              timerOutput.state.isActive.value
            ) {
              l(
                `${p(input)} turned false, ${p(output)} is on and is timer is running, restarting ${p(timerOutput)}`,
              );

              timerOutput.state.start();
            }

            return;
          }
          prime = false;

          if (output.main.setState.value && timerOutput.state.isEnabled.value) {
            l(
              `${p(input)} turned false, ${p(output)} is on, timer is enabled and this logic was primed by true state from the same input before, (re)starting ${p(timerOutput)}`,
            );

            timerOutput.state.start();
          }
        };

        // eslint-disable-next-line default-case
        switch (input.$) {
          case 'door': {
            input.open.state.observe(fn);
            break;
          }
          case 'input': {
            input.state.observe(fn);
            break;
          }
        }
      }

      automationEnableState.observe((value) => {
        if (timerOutput.state.isActive.value) {
          l(
            `${p(automationEnable)} triggered with timer running, stopping ${p(timerOutput)}`,
          );

          timerOutput.state.stop();
        }

        if (!value) {
          if (timerAutomation.state.isEnabled) {
            l(
              `${p(automationEnable)} turned off with timer enabled, (re)starting ${p(timerAutomation)}`,
            );

            timerAutomation.state.start();
          }

          return;
        }

        if (timerAutomation.state.isActive.value) {
          l(
            `${p(automationEnable)} turned on with timer running, stopping ${p(timerAutomation)}`,
          );
          timerAutomation.state.stop();
        }
      }, true);

      timerOutput.state.observe(() => {
        if (output.main.setState.value) {
          l(
            `${p(timerOutput)} ran out with output on, turning off ${p(output)}`,
          );

          outputSetterSourceIsTimerRunningOut = true;
          output.main.setState.value = false;
        }
      });

      for (const input of inputsManual) {
        const fn = () => {
          l(`${p(input)} was triggered…`);

          if (output.main.setState.value) {
            l(
              `${p(input)} was triggered wth output on, turning off ${p(output)}`,
            );

            output.main.setState.value = false;

            return;
          }

          l(
            `${p(input)} was triggered with ${p(output)} off, triggering ${p(autoLight)}`,
          );

          autoLight.state.trigger();
        };

        // eslint-disable-next-line default-case
        switch (input.$) {
          case 'button': {
            input.state.up(fn);
            break;
          }
          case 'buttonPrimitive': {
            input.state.observe(fn);
            break;
          }
        }
      }

      timerAutomation.state.observe(() => {
        if (!automationEnableState.value) {
          l(
            `${p(timerAutomation)} ran out with automation disabled, turning on ${p(automationEnable)}`,
          );

          automationEnableState.value = true;
        }
      });
    };

    return {
      $,
      $init,
      automationEnable: {
        main: automationEnable,
      },
      internal: {
        $noMainReference: true as const,
        inputsAutomated,
        inputsManual,
        output,
      },
      timerAutomation,
      timerOutput,
    };
  })(),
  mirrorLightLogic: manualInputLogic(properties.mirrorLight, [
    instances.wallswitchMirrorTop,
  ]),
};

const $init: InitFunction = async (room, introspection) => {
  const {
    mirrorHeatingButton,
    mirrorLightButton,
    nightLightButton,
    wallswitchDoor,
    wallswitchMirrorBottom,
    wallswitchMirrorTop,
  } = instances;
  const { allLights, allThings } = groups;
  const { mirrorHeating, mirrorHeatingTimer, mirrorLight, nightLight } =
    properties;
  const {
    astronomicalTwilightLighting,
    autoLight,
    civilTwilightLighting,
    dayLighting,
    nauticalTwilightLighting,
    nightLighting,
  } = scenes;

  const p = makePathStringRetriever(introspection);
  const l = makeCustomStringLogger(
    logger.getInput({
      head: p(room),
    }),
    logicReasoningLevel,
  );

  mirrorHeatingButton.state.up(() =>
    flipMain(mirrorHeating, () =>
      l(
        `${p(mirrorHeatingButton)} ${mirrorHeatingButton.state.up.name} flipped ${p(mirrorHeating)}`,
      ),
    ),
  );

  mirrorHeatingButton.state.longPress(() =>
    setMain(allThings, false, () =>
      l(
        `${p(mirrorHeatingButton)} ${mirrorHeatingButton.state.longPress.name} turned off ${p(allThings)}`,
      ),
    ),
  );

  mirrorLightButton.state.up(() =>
    flipMain(mirrorLight, () =>
      l(
        `${p(mirrorLightButton)} ${mirrorLightButton.state.up.name} flipped ${p(mirrorLight)}`,
      ),
    ),
  );

  mirrorLightButton.state.longPress(() =>
    setMain(allThings, false, () =>
      l(
        `${p(mirrorLightButton)} ${mirrorLightButton.state.longPress.name} turned off ${p(allThings)}`,
      ),
    ),
  );

  nightLightButton.state.up(() =>
    flipMain(nightLight, () =>
      l(
        `${p(nightLightButton)} ${nightLightButton.state.up.name} flipped ${p(nightLight)}`,
      ),
    ),
  );

  nightLightButton.state.longPress(() =>
    setMain(allThings, false, () =>
      l(
        `${p(nightLightButton)} ${nightLightButton.state.longPress.name} turned off ${p(allThings)}`,
      ),
    ),
  );

  wallswitchDoor.state.longPress(() =>
    flipMain(allThings, () =>
      l(
        `${p(wallswitchDoor)} ${wallswitchDoor.state.longPress.name} flipped ${p(allThings)}`,
      ),
    ),
  );

  wallswitchMirrorTop.state.longPress(() =>
    setMain(allThings, false, () =>
      l(
        `${p(wallswitchMirrorTop)} ${wallswitchMirrorTop.state.longPress.name} turned off ${p(allThings)}`,
      ),
    ),
  );

  wallswitchMirrorBottom.state.longPress(() =>
    setMain(allThings, false, () =>
      l(
        `${p(wallswitchMirrorBottom)} ${wallswitchMirrorBottom.state.longPress.name} turned off ${p(allThings)}`,
      ),
    ),
  );

  mirrorHeating.main.setState.observe((value) => {
    l(
      `${p(mirrorHeatingTimer)} was ${value ? 'started' : 'stopped'} because ${p(mirrorHeating)} was turned ${value ? 'on' : 'off'}`,
    );

    mirrorHeatingTimer.state[value ? 'start' : 'stop']();
  });

  mirrorHeatingTimer.state.observe(() =>
    setMain(mirrorHeating, false, () =>
      l(
        `${p(mirrorHeating)} was turned off because ${p(mirrorHeating)} ran out`,
      ),
    ),
  );

  allLights.main.setState.observe((value) => {
    setMain(mirrorHeating, value, () =>
      l(
        `${p(mirrorHeating)} was turned ${value ? 'on' : 'off'} because ${p(allLights)} was turned ${value ? 'on' : 'off'}`,
      ),
    );
  });

  autoLight.state.observe(() => {
    let failover = false;

    const elevation = sunElevation();

    if (isNight(elevation)) {
      if (devices.nightLight.device.online.main.state.value) {
        setMain(nightLighting, true, () =>
          l(
            `${p(nightLighting)} was turned on because sun elevation is ${elevation}`,
          ),
        );

        return;
      }

      failover = true;
    }

    if (isAstronomicalTwilight(elevation) || failover) {
      if (
        devices.leds.device.online.main.state.value ||
        devices.nightLight.device.online.main.state.value
      ) {
        setMain(astronomicalTwilightLighting, true, () =>
          l(
            `${p(astronomicalTwilightLighting)} was turned on because sun elevation is ${elevation}`,
          ),
        );

        return;
      }

      failover = true;
    }

    if (isNauticalTwilight(elevation) || failover) {
      if (
        devices.leds.device.online.main.state.value ||
        devices.mirrorLight.device.online.main.state.value
      ) {
        setMain(nauticalTwilightLighting, true, () =>
          l(
            `${p(nauticalTwilightLighting)} was turned on because sun elevation is ${elevation}`,
          ),
        );

        return;
      }

      failover = true;
    }

    if (
      (isCivilTwilight(elevation) || failover) &&
      (devices.leds.device.online.main.state.value ||
        devices.mirrorLight.device.online.main.state.value ||
        devices.nightLight.device.online.main.state.value)
    ) {
      setMain(civilTwilightLighting, true, () =>
        l(
          `${p(civilTwilightLighting)} was turned on because sun elevation is ${elevation}`,
        ),
      );

      return;
    }

    if (
      devices.ceilingLight.device.online.main.state.value ||
      devices.leds.device.online.main.state.value ||
      devices.mirrorLight.device.online.main.state.value
    ) {
      setMain(dayLighting, true, () =>
        l(
          `${p(dayLighting)} was turned on because sun elevation is ${elevation}`,
        ),
      );

      return;
    }

    setMain(allLights, true, () =>
      l(`${p(allLights)} was turned on because scene members not online`),
    );
  });
};

export const mrpelzBathroom = {
  $: 'mrpelzBathroom' as const,
  $init,
  devices: deviceMap(devices),
  level: Level.ROOM as const,
  ...groups,
  ...instances,
  ...logic,
  ...properties,
  ...scenes,
};
