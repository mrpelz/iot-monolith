/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Level,
  ValueType,
  element,
  symbolLevel,
  symbolMain,
} from '../lib/tree/main.js';
import { Observable, ReadOnlyObservable } from '../lib/observable.js';
import {
  isAstronomicalTwilight as isAstronomicalTwilightUtil,
  isCivilTwilight as isCivilTwilightUtil,
  isDay as isDayUtil,
  isNauticalTwilight as isNauticalTwilightUtil,
  isNight as isNightUtil,
  sunElevation as sunElevationUtil,
} from './util.js';
import { Schedule } from '../lib/schedule.js';
import { getter } from '../lib/tree/elements/getter.js';

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
  const isCivilTwilight = new Observable(getValues().isCivilTwilight);
  const isDay = new Observable(getValues().isDay);
  const isNauticalTwilight = new Observable(getValues().isNauticalTwilight);
  const isNight = new Observable(getValues().isNight);

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
    sunElevation: element({
      isAstronomicalTwilight: getter(
        ValueType.BOOLEAN,
        new ReadOnlyObservable(isAstronomicalTwilight)
      ),
      isCivilTwilight: getter(
        ValueType.BOOLEAN,
        new ReadOnlyObservable(isCivilTwilight)
      ),
      isDay: getter(ValueType.BOOLEAN, new ReadOnlyObservable(isDay)),
      isNauticalTwilight: getter(
        ValueType.BOOLEAN,
        new ReadOnlyObservable(isNauticalTwilight)
      ),
      isNight: getter(ValueType.BOOLEAN, new ReadOnlyObservable(isNight)),
      [symbolLevel]: Level.PROPERTY,
      [symbolMain]: getter(ValueType.NUMBER, readOnlyElevation),
    }),
  };
};
