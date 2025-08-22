import {
  AnyObservable,
  ObservableGroup,
  ProxyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '@mrpelz/observable';
import { BooleanProxyState, NullState } from '@mrpelz/observable/state';
import sunCalc from 'suncalc';

import { Context } from '../lib/tree/context.js';
import { setter } from '../lib/tree/elements/setter.js';
import { trigger } from '../lib/tree/elements/trigger.js';
import { ValueType } from '../lib/tree/main.js';
import { InitFunction } from '../lib/tree/operations/init.js';
import { led as led_ } from '../lib/tree/properties/actuators.js';

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

class MergedBrightness extends ObservableGroup<number | null> {
  protected _merge(): number | null {
    const validValues = this.values.filter(
      (value): value is number => typeof value === 'number',
    );

    return validValues.length > 0 ? Math.min(...validValues) : null;
  }
}

export const overriddenLed = (
  context: Context,
  led: ReturnType<typeof led_>,
  isOverridden: AnyObservable<boolean>,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
) => {
  const { $, actuatorStaleness, brightness, level, topic } = led;

  const actualBrightness = new ReadOnlyObservable(
    new MergedBrightness(0, [
      brightness.state,
      new ReadOnlyProxyObservable(isOverridden, (value) => {
        if (brightness.state.value === null) return null;

        return value ? 1 : 0;
      }),
    ]),
  );

  const setBrightness = new ProxyObservable(
    brightness.setState,
    (value) => (isOverridden.value ? value : 0),
    (value) => (isOverridden.value ? value : ProxyObservable.doNotSet),
  );

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
