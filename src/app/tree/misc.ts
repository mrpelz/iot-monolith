/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level, ValueType } from '../../lib/tree/main.js';
import { Observable, ReadOnlyObservable } from '../../lib/observable.js';
import {
  isAstronomicalTwilight as isAstronomicalTwilightUtil,
  isCivilTwilight as isCivilTwilightUtil,
  isDay as isDayUtil,
  isNauticalTwilight as isNauticalTwilightUtil,
  isNight as isNightUtil,
  sunElevation as sunElevationUtil,
} from '../util.js';
import { Schedule } from '../../lib/schedule.js';
import { addMetric } from '../../lib/tree/operations/metrics.js';
import { getter } from '../../lib/tree/elements/getter.js';

export const sunElevation = (schedule: Schedule) => {
  const getValues = () => {
    const elevation = sunElevationUtil();

    return {
      elevation,
      isAstronomicalTwilight: isAstronomicalTwilightUtil(elevation),
      isCivilTwilight: isCivilTwilightUtil(elevation),
      isDay: isDayUtil(elevation),
      isNauticalTwilight: isNauticalTwilightUtil(elevation),
      isNight: isNightUtil(elevation),
    };
  };

  const elevation = new Observable(getValues().elevation);
  const readOnlyElevation = new ReadOnlyObservable(elevation);

  const isAstronomicalTwilight = new Observable(
    getValues().isAstronomicalTwilight
  );
  const readOnlyIsAstronomicalTwilight = new ReadOnlyObservable(
    isAstronomicalTwilight
  );

  const isCivilTwilight = new Observable(getValues().isCivilTwilight);
  const readOnlyIsCivilTwilight = new ReadOnlyObservable(isCivilTwilight);

  const isDay = new Observable(getValues().isDay);
  const readOnlyIsDay = new ReadOnlyObservable(isDay);

  const isNauticalTwilight = new Observable(getValues().isNauticalTwilight);
  const readOnlyIsNauticalTwilight = new ReadOnlyObservable(isNauticalTwilight);

  const isNight = new Observable(getValues().isNight);
  const readOnlyIsNight = new ReadOnlyObservable(isNight);

  schedule.addTask(() => {
    const state = getValues();

    elevation.value = state.elevation;

    isAstronomicalTwilight.value = state.isAstronomicalTwilight;
    isCivilTwilight.value = state.isCivilTwilight;
    isDay.value = state.isDay;
    isNauticalTwilight.value = state.isNauticalTwilight;
    isNight.value = state.isNight;
  });

  return {
    sunElevation: new Element({
      $: 'sunElevation' as const,
      ...addMetric(
        'sunElevation' as const,
        readOnlyElevation,
        {
          isAstronomicalTwilight: readOnlyIsAstronomicalTwilight,
          isCivilTwilight: readOnlyIsCivilTwilight,
          isDay: readOnlyIsDay,
          isNauticalTwilight: readOnlyIsNauticalTwilight,
          isNight: readOnlyIsNight,
          unit: 'degrees',
        },
        'sun elevation angle in degrees'
      ),
      isAstronomicalTwilight: getter(
        ValueType.BOOLEAN,
        readOnlyIsAstronomicalTwilight
      ),
      isCivilTwilight: getter(ValueType.BOOLEAN, readOnlyIsCivilTwilight),
      isDay: getter(ValueType.BOOLEAN, readOnlyIsDay),
      isNauticalTwilight: getter(ValueType.BOOLEAN, readOnlyIsNauticalTwilight),
      isNight: getter(ValueType.BOOLEAN, readOnlyIsNight),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, readOnlyElevation),
    }),
  };
};
