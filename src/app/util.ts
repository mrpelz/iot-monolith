/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { sleep } from '@mrpelz/misc-utils/sleep';
import { epochs } from '@mrpelz/modifiable-date';
import {
  AnyWritableObservable,
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '@mrpelz/observable';
import {
  BooleanGroupStrategy,
  BooleanProxyState,
  BooleanState,
  BooleanStateGroup,
  NullState,
} from '@mrpelz/observable/state';
import sunCalc from 'suncalc';

import { makeCustomStringLogger } from '../lib/log.js';
import { Schedule } from '../lib/schedule.js';
import { setter } from '../lib/tree/elements/setter.js';
import { trigger } from '../lib/tree/elements/trigger.js';
import { ValueType } from '../lib/tree/main.js';
import { InitFunction } from '../lib/tree/operations/init.js';
import { makePathStringRetriever } from '../lib/tree/operations/introspection.js';
import {
  led as led_,
  ledGrouping,
  output as output_,
  outputGrouping,
  scene,
  SceneMember,
} from '../lib/tree/properties/actuators.js';
import { timer } from '../lib/tree/properties/logic.js';
import {
  button,
  buttonPrimitive,
  door,
  input as input_,
  motion,
  window,
} from '../lib/tree/properties/sensors.js';
import { context } from './context.js';
import { logger, logicReasoningLevel } from './logging.js';
import { persistence } from './persistence.js';
import { every5Seconds } from './timings.js';

export const LATITUDE = 53.547_47;
export const LONGITUDE = 10.015_98;

const DEGREES_PER_RADIAN = 180 / Math.PI;

export const radiansToDegrees = (input: number): number =>
  input * DEGREES_PER_RADIAN;

export const sunElevation = (): number => {
  const { altitude } = sunCalc.getPosition(new Date(), LATITUDE, LONGITUDE);
  return radiansToDegrees(altitude);
};

export const sunlightLeds = (): { red: number; white: number } => {
  const now = new Date();

  const { altitude: solarNoonAltitude_ } = sunCalc.getPosition(
    sunCalc.getTimes(now, LATITUDE, LONGITUDE).solarNoon,
    LATITUDE,
    LONGITUDE,
  );
  const solarNoonAltitude = radiansToDegrees(solarNoonAltitude_);

  const { altitude: nadirAltitude_ } = sunCalc.getPosition(
    sunCalc.getTimes(now, LATITUDE, LONGITUDE).nadir,
    LATITUDE,
    LONGITUDE,
  );
  const nadirAltitude = radiansToDegrees(nadirAltitude_);

  const { altitude: altitude_ } = sunCalc.getPosition(now, LATITUDE, LONGITUDE);
  const altitude = radiansToDegrees(altitude_);

  const normalizedTheta =
    ((altitude - nadirAltitude) / (solarNoonAltitude - nadirAltitude)) * 2 - 1;

  const red = Math.max(0, Math.cos((normalizedTheta * Math.PI) / 2));
  const white = Math.max(0, Math.sin((normalizedTheta * Math.PI) / 2));

  return { red, white };
};

export const isTwilightPhase = (
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  elevation = sunElevation(),
): boolean => elevation > min && elevation <= max;

export const isDay = (elevation?: number): boolean =>
  isTwilightPhase(0, undefined, elevation);

export const isCivilTwilight = (elevation?: number): boolean =>
  isTwilightPhase(-6, 0, elevation);

export const isNauticalTwilight = (elevation?: number): boolean =>
  isTwilightPhase(-12, -6, elevation);

export const isAstronomicalTwilight = (elevation?: number): boolean =>
  isTwilightPhase(-18, -12, elevation);

export const isNight = (elevation?: number): boolean =>
  isTwilightPhase(undefined, -18, elevation);

export const overriddenLed = (
  led: ReturnType<typeof led_>,
  isOverridden: AnyWritableObservable<boolean>,
) => {
  const { $, actuatorStaleness, brightness, level, topic } = led;

  const actualBrightness_ = new Observable(brightness.state.value);
  const actualBrightness = new ReadOnlyObservable(actualBrightness_);
  brightness.state.observe((value) => {
    if (!isOverridden.value) return;

    actualBrightness_.value = value;
  }, true);

  const setBrightness = new Observable(
    brightness.setState.value,
    (value) => {
      if (value === brightness.setState.value) return;
      if (!isOverridden.value) return;

      brightness.setState.value = value;
    },
    true,
  );
  brightness.setState.observe((value) => {
    if (value === setBrightness.value) return;
    if (!isOverridden.value) return;

    setBrightness.value = value;
  }, true);

  isOverridden.observe((value) => {
    if (value) {
      brightness.setState.value = setBrightness.value;
      return;
    }

    setBrightness.value = 0;
    actualBrightness_.value = 0;
  });

  every5Seconds.addTask(() => {
    if (isOverridden.value) return;
    if (setBrightness.value === 0) return;

    setBrightness.value = 0;
    actualBrightness_.value = 0;
  });

  const actualOn = new ReadOnlyProxyObservable(actualBrightness, (value) =>
    value === null ? value : Boolean(value),
  );

  const setOn = new BooleanProxyState(
    setBrightness,
    (value) => Boolean(value),
    (value) => (value ? 1 : 0),
  );

  const $init: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    context.persistence.observe(mainReference.pathString, setBrightness);
  };

  return {
    $,
    $init,
    actuatorStaleness,
    automated: {
      $exclude: true as const,
      led,
    },
    brightness: setter(ValueType.NUMBER, setBrightness, actualBrightness),
    flip: trigger(ValueType.NULL, new NullState(() => setOn.flip())),
    level,
    main: setter(ValueType.BOOLEAN, setOn, actualOn, 'on'),
    overridden: isOverridden,
    topic,
  };
};

export const automatedInputLogic = (
  output:
    | ReturnType<typeof output_>
    | ReturnType<typeof led_>
    | ReturnType<typeof outputGrouping>
    | ReturnType<typeof ledGrouping>,
  inputsAutomated: (
    | ReturnType<typeof input_>
    | ReturnType<typeof motion>
    | ReturnType<typeof door>
    | ReturnType<typeof window>
  )[],
  inputsManual: (
    | ReturnType<typeof button>
    | ReturnType<typeof buttonPrimitive>
  )[],
  timeoutOutput = epochs.minute * 3,
  timeoutAutomation = epochs.minute * 10,
  automationEnableSchedule?: Schedule,
  automationDisableSchedule?: Schedule,
) => {
  const $ = 'automatedInputLogic' as const;

  const automationEnableStateManual = new BooleanState(true);
  const automationEnableStateScheduled = new BooleanState(true);
  const automationEnableState = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    [automationEnableStateManual, automationEnableStateScheduled],
  );

  const automationEnable = scene(
    context,
    [new SceneMember(automationEnableStateManual, true, false)],
    'automation',
  );

  const timerOutput = timer(context, timeoutOutput);
  const timerAutomation = timer(context, timeoutAutomation);

  const $init: InitFunction = async (object, introspection) => {
    let upstart = true;
    sleep(1000).then(() => (upstart = false));

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
      persistence.observe(automationEnablePath, automationEnableStateScheduled);
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
        automationEnableStateManual.value = false;
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
      const fn = (value: boolean | null) => {
        l(`${p(input)} turned ${JSON.stringify(value)}…`);

        if (!automationEnableState.value) {
          l(
            `${p(input)} turned ${JSON.stringify(value)} and ${p(automationEnable)} is false, not doing anything`,
          );

          return;
        }

        if (value) {
          if (!output.main.state.value) {
            l(
              `${p(input)} turned true with output off, turning on ${p(output)}`,
            );

            output.main.setState.value = true;
          }

          if (timerOutput.state.isActive.value) {
            l(
              `${p(input)} turned true with timer running, stopping ${p(timerOutput)}`,
            );

            timerOutput.state.stop();
          }

          return;
        }

        if (output.main.setState.value && timerOutput.state.isEnabled.value) {
          l(
            `${p(input)} turned false, ${p(output)} is on and timer is enabled, (re)starting ${p(timerOutput)}`,
          );

          timerOutput.state.start();
        }
      };

      // eslint-disable-next-line default-case
      switch (input.$) {
        case 'door':
        case 'window': {
          input.open.state.observe(fn);
          break;
        }
        case 'input':
        case 'motion': {
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
      if (output.main.state.value) {
        l(`${p(timerOutput)} ran out with output on, turning off ${p(output)}`);

        outputSetterSourceIsTimerRunningOut = true;
        output.main.setState.value = false;
      }
    });

    for (const input of inputsManual) {
      const fn = () => {
        l(`${p(input)} was triggered, flipping ${p(output)}`);

        output.flip.setState.trigger();
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
      if (!automationEnableStateManual.value) {
        l(
          `${p(timerAutomation)} ran out with automation disabled, turning on ${p(automationEnable)}`,
        );

        automationEnableStateManual.value = true;
      }
    });

    automationEnableSchedule?.addTask(() => {
      l(`scheduled activation of ${p(automationEnable)} logic`);

      automationEnableStateScheduled.value = true;
    });

    automationDisableSchedule?.addTask(() => {
      l(`scheduled deactivation of ${p(automationEnable)} logic`);

      automationEnableStateScheduled.value = false;
    });
  };

  return {
    $,
    $init,
    automationEnable,
    internal: {
      $noMainReference: true as const,
      inputsAutomated,
      inputsManual,
      output,
    },
    timerAutomation,
    timerOutput,
  };
};

export const manualInputLogic = (
  output:
    | ReturnType<typeof output_>
    | ReturnType<typeof led_>
    | ReturnType<typeof outputGrouping>
    | ReturnType<typeof ledGrouping>,
  inputs: (ReturnType<typeof button> | ReturnType<typeof buttonPrimitive>)[],
) => {
  const $ = 'manualInputLogic' as const;

  const $init: InitFunction = async (object, introspection) => {
    const parent = introspection.getObject(object)?.mainReference?.parent;
    const p = makePathStringRetriever(introspection);
    const l = makeCustomStringLogger(
      logger.getInput({
        head: p(parent ?? object),
      }),
      logicReasoningLevel,
    );

    for (const input of inputs) {
      const fn = () => {
        l(`${p(input)} was triggered, flipping ${p(output)}`);

        output.flip.setState.trigger();
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
  };

  return {
    $,
    $init,
    internal: {
      $noMainReference: true as const,
      inputs,
      output,
    },
  };
};
