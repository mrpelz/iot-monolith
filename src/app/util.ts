import sunCalc from 'suncalc';

import {
  AnyObservable,
  ObservableGroup,
  ProxyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../lib/observable.js';
import { BooleanProxyState, NullState } from '../lib/state.js';
import { setter } from '../lib/tree/elements/setter.js';
import { trigger } from '../lib/tree/elements/trigger.js';
import { ValueType } from '../lib/tree/main.js';
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

export const relativeSunElevationOfDay = (): number => {
  const now = new Date();

  const { solarNoon: solarNoonTime } = sunCalc.getTimes(
    now,
    LATITUDE,
    LONGITUDE,
  );

  const { altitude: solarNoon } = sunCalc.getPosition(
    solarNoonTime,
    LATITUDE,
    LONGITUDE,
  );
  const solarNoonAltitude = radiansToDegrees(solarNoon);

  const { altitude } = sunCalc.getPosition(new Date(), LATITUDE, LONGITUDE);
  const altitudeOnRange = Math.max(radiansToDegrees(altitude), 0);

  return altitudeOnRange / solarNoonAltitude;
};

export const relativeSunElevationOfNight = (): number => {
  const now = new Date();

  const { nadir: nadirTime } = sunCalc.getTimes(now, LATITUDE, LONGITUDE);

  const { altitude: nadir } = sunCalc.getPosition(
    nadirTime,
    LATITUDE,
    LONGITUDE,
  );
  const nadirAltitude = radiansToDegrees(nadir);

  const { altitude } = sunCalc.getPosition(new Date(), LATITUDE, LONGITUDE);
  const altitudeOnRange = Math.max(
    radiansToDegrees(altitude) - nadirAltitude,
    nadirAltitude,
  );

  return altitudeOnRange / nadirAltitude + 1;
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
    (value) => value,
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

  return {
    $,
    $init: () => {
      // noop
    },
    actuatorStaleness,
    brightness: setter(ValueType.NUMBER, setBrightness, actualBrightness),
    flip: trigger(ValueType.NULL, new NullState(() => setOn.flip())),
    level,
    main: setter(ValueType.BOOLEAN, setOn, actualOn, 'on'),
    topic,
  };
};
