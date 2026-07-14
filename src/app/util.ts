/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { sleep } from '@mrpelz/misc-utils/sleep';
import { epochs } from '@mrpelz/modifiable-date';
import {
  AnyObservableOrNullState,
  AnyWritableObservable,
  Observable,
  ObserverCallback,
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
import * as sunCalc from 'suncalc';

import { makeCustomStringLogger } from '../lib/log.js';
import { Schedule } from '../lib/schedule.js';
import { getter } from '../lib/tree/elements/getter.js';
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
  outputNgDimmable,
} from '../lib/tree/properties/actuators.js';
import { timer } from '../lib/tree/properties/logic.js';
import {
  button,
  buttonPrimitive,
  door,
  input as input_,
  motion,
  motionHMMD,
  window,
} from '../lib/tree/properties/sensors.js';
import { context } from './context.js';
import { logger, logicReasoningLevel } from './logging.js';
import { persistence } from './persistence.js';
import { epoch30Seconds, every5Seconds } from './timings.js';

export const LATITUDE = 53.547_47;
export const LONGITUDE = 10.015_98;

const DEGREES_PER_RADIAN = 180 / Math.PI;

export const radiansToDegrees = (input: number): number =>
  input * DEGREES_PER_RADIAN;

export const sunElevation = (): number => {
  const { altitude } = sunCalc.getPosition(new Date(), LATITUDE, LONGITUDE);
  return altitude;
};

export const sunlightLeds = (): { red: number; white: number } => {
  const now = new Date();

  const { altitude: solarNoonAltitude } = sunCalc.getPosition(
    sunCalc.getTimes(now, LATITUDE, LONGITUDE).solarNoon,
    LATITUDE,
    LONGITUDE,
  );

  const { altitude: nadirAltitude } = sunCalc.getPosition(
    sunCalc.getTimes(now, LATITUDE, LONGITUDE).nadir,
    LATITUDE,
    LONGITUDE,
  );

  const { altitude } = sunCalc.getPosition(now, LATITUDE, LONGITUDE);

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
  led: ReturnType<typeof led_> | ReturnType<typeof outputNgDimmable>,
  isOverridden: AnyWritableObservable<boolean>,
) => {
  const { $, actuatorStaleness, brightness, level, topic } = led;

  const actualBrightness_ = new Observable(brightness.state.value);
  const actualBrightness = new ReadOnlyObservable(actualBrightness_);
  brightness.state.observe((value, _observer, _changed, origin) => {
    if (!isOverridden.value) return;

    actualBrightness_.set(value, origin);
  }, true);

  const setBrightness = new Observable(
    brightness.setState.value,
    (value, _changed, origin) => {
      if (value === brightness.setState.value) return;
      if (!isOverridden.value) return;

      brightness.setState.set(value, origin);
    },
    true,
  );
  brightness.setState.observe((value, _observer, _changed, origin) => {
    if (value === setBrightness.value) return;
    if (!isOverridden.value) return;

    setBrightness.set(value, origin);
  }, true);

  isOverridden.observe((value, _observer, _changed, origin) => {
    if (value) {
      brightness.setState.set(setBrightness.value, origin);
      return;
    }

    setBrightness.set(0, origin);
    actualBrightness_.set(0, origin);
  });

  every5Seconds.addTask(() => {
    if (isOverridden.value) return;
    if (setBrightness.value === 0) return;

    setBrightness.set(0);
    actualBrightness_.set(0);
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
    | ReturnType<typeof motionHMMD>
    | ReturnType<typeof door>
    | ReturnType<typeof window>
  )[],
  inputsManual: (
    ReturnType<typeof button> | ReturnType<typeof buttonPrimitive>
  )[],
  timeoutOutput = epochs.minute * 15,
  timeoutAutomation = epoch30Seconds,
  automationEnableSchedule?: Schedule,
  automationDisableSchedule?: Schedule,
  startTimerFromManualOn = false,
) => {
  const $ = 'automatedInputLogic' as const;

  const automationEnableManualState = new BooleanState(true);
  const automationEnableManual = setter(
    ValueType.BOOLEAN,
    automationEnableManualState,
  );

  const automationEnablePermanentState = new BooleanState(true);
  const automationEnablePermanent = setter(
    ValueType.BOOLEAN,
    automationEnablePermanentState,
  );

  const automationEnableScheduledState = new BooleanState(true);
  const automationEnableScheduled = getter(
    ValueType.BOOLEAN,
    new ReadOnlyObservable(automationEnableScheduledState),
  );

  const automationEnableState = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    [
      automationEnableManualState,
      automationEnablePermanentState,
      automationEnableScheduledState,
    ],
  );
  const automationEnable = getter(
    ValueType.BOOLEAN,
    new ReadOnlyObservable(automationEnableState),
  );

  const timerOutput = timer(context, timeoutOutput);
  const timerAutomation = timer(context, timeoutAutomation);

  const $init: InitFunction = async (object, introspection) => {
    let upstart = true;
    sleep(5000).then(() => (upstart = false));

    const parent = introspection.getObject(object)?.mainReference?.parent;
    const p = makePathStringRetriever(introspection);
    const l = makeCustomStringLogger(
      logger.getInput({
        head: p(parent ?? object),
      }),
      logicReasoningLevel,
    );

    const automationEnableManualPath = p(automationEnableManual);
    if (automationEnableManualPath) {
      persistence.observe(
        automationEnableManualPath,
        automationEnableManualState,
      );
    }

    const automationEnablePermanentPath = p(automationEnablePermanent);
    if (automationEnablePermanentPath) {
      persistence.observe(
        automationEnablePermanentPath,
        automationEnablePermanentState,
      );
    }

    const inputsAutomatedStates: AnyObservableOrNullState[] = [];

    output.main.setState.observe((value, _observer, _changed, origin) => {
      if (value) {
        if (
          startTimerFromManualOn &&
          timerOutput.state.isEnabled.value &&
          !inputsAutomatedStates.includes(origin)
        ) {
          l(
            `${p(
              output,
            )} was turned on, "startTimerFromManualOn" is true and timer is enabled, (re)starting ${p(
              timerOutput,
            )}`,
          );

          timerOutput.state.start();
        }

        automationEnableManualState.set(true, origin);

        return;
      }

      if (!upstart && origin !== timerOutput.state) {
        l(
          `${p(output)} was turned off from source that is not ${p(
            timerOutput,
          )}, disabling ${p(automationEnableManual)}`,
        );
        automationEnableManualState.set(false, origin);
      }

      if (timerOutput.state.isActive.value) {
        l(
          `${p(output)} was turned off with timer running, stopping ${p(
            timerOutput,
          )}`,
        );
        timerOutput.state.stop();
      }
    }, true);

    for (const input of inputsAutomated) {
      let prime = false;

      const fn: ObserverCallback<boolean | null> = (
        value,
        _observer,
        _changed,
        origin,
      ) => {
        l(`${p(input)} turned ${JSON.stringify(value)}…`);

        if (!automationEnableState.value) {
          l(
            `${p(input)} turned ${JSON.stringify(value)} and ${p(
              automationEnable,
            )} is false, not doing anything`,
          );

          return;
        }

        if (value) {
          l(`${p(input)} turned true, priming`);
          prime = true;

          if (!output.main.setState.value) {
            l(
              `${p(input)} turned true with output off, turning on ${p(
                output,
              )} and priming`,
            );

            output.main.setState.set(true, origin);
          }

          if (timerOutput.state.isActive.value) {
            l(`${p(input)} turned true, stopping ${p(timerOutput)}`);

            timerOutput.state.stop();
          }

          return;
        }

        if (!prime) {
          if (output.main.setState.value && timerOutput.state.isActive.value) {
            l(
              `${p(input)} turned false, ${p(
                output,
              )} is on and is timer is running, restarting ${p(timerOutput)}`,
            );

            timerOutput.state.start();
          }

          return;
        }
        prime = false;

        if (output.main.setState.value && timerOutput.state.isEnabled.value) {
          l(
            `${p(input)} turned false, ${p(
              output,
            )} is on, timer is enabled and this logic was primed by true state from the same input before, (re)starting ${p(
              timerOutput,
            )}`,
          );

          timerOutput.state.start();
        }
      };

      // eslint-disable-next-line default-case
      switch (input.$) {
        case 'door':
        case 'window': {
          inputsAutomatedStates.push(input.open.state);
          input.open.state.observe(fn, true);
          break;
        }
        case 'input':
        case 'motion':
        case 'hmmdMotion': {
          inputsAutomatedStates.push(input.state);
          input.state.observe(fn, true);
          break;
        }
      }
    }

    automationEnableManualState.observe((value) => {
      if (!value) {
        if (timerAutomation.state.isEnabled) {
          l(
            `${p(
              automationEnableManual,
            )} turned off with timer enabled, (re)starting ${p(
              timerAutomation,
            )}`,
          );

          timerAutomation.state.start();
        }

        return;
      }

      if (timerAutomation.state.isActive.value) {
        l(
          `${p(
            automationEnableManual,
          )} turned on with timer running, stopping ${p(timerAutomation)}`,
        );
        timerAutomation.state.stop();
      }
    }, true);

    timerOutput.state.observe((_value, _observer, _changed, origin) => {
      if (output.main.setState.value) {
        l(`${p(timerOutput)} ran out with output on, turning off ${p(output)}`);

        output.main.setState.set(false, origin);
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

    timerAutomation.state.observe((_value, _observer, _changed, origin) => {
      if (!automationEnableManualState.value) {
        l(
          `${p(
            timerAutomation,
          )} ran out with automation disabled, turning on ${p(
            automationEnableManual,
          )}`,
        );

        automationEnableManualState.set(true, origin);
      }
    });

    automationEnableSchedule?.addTask(() => {
      l(`scheduled activation of ${p(automationEnable)} logic`);

      automationEnableScheduledState.set(true);
    });

    automationDisableSchedule?.addTask(() => {
      l(`scheduled deactivation of ${p(automationEnable)} logic`);

      automationEnableScheduledState.set(false);
    });
  };

  return {
    $,
    $init,
    automationEnable: {
      main: automationEnable,
      manual: automationEnableManual,
      permanent: automationEnablePermanent,
      scheduled: automationEnableScheduled,
    },
    internal: {
      $noMainReference: true as const,
      inputsAutomated,
      inputsManual,
      output,
    },
    startTimerFromManualOn,
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
