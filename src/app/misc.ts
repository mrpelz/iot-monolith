/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, ValueType, addMeta } from '../lib/tree/main.js';
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

export const sunElevation = (schedule: Schedule) => {
  const getter = () => {
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

  const elevation = new Observable(getter().elevation);
  const readOnlyElevation = new ReadOnlyObservable(elevation);

  const isAstronomicalTwilight = new Observable(
    getter().isAstronomicalTwilight
  );
  const isCivilTwilight = new Observable(getter().isCivilTwilight);
  const isDay = new Observable(getter().isDay);
  const isNauticalTwilight = new Observable(getter().isNauticalTwilight);
  const isNight = new Observable(getter().isNight);

  schedule.addTask(() => {
    const state = getter();

    elevation.value = state.elevation;
  });

  return {
    sunElevation: addMeta(
      {
        _get: readOnlyElevation,
        isAstronomicalTwilight: addMeta(
          {
            _get: new ReadOnlyObservable(isAstronomicalTwilight),
          },
          {
            level: Levels.PROPERTY,
            type: 'sensor',
            valueType: ValueType.BOOLEAN,
          }
        ),
        isCivilTwilight: addMeta(
          {
            _get: new ReadOnlyObservable(isCivilTwilight),
          },
          {
            level: Levels.PROPERTY,
            type: 'sensor',
            valueType: ValueType.BOOLEAN,
          }
        ),
        isDay: addMeta(
          {
            _get: new ReadOnlyObservable(isDay),
          },
          {
            level: Levels.PROPERTY,
            type: 'sensor',
            valueType: ValueType.BOOLEAN,
          }
        ),
        isNauticalTwilight: addMeta(
          {
            _get: new ReadOnlyObservable(isNauticalTwilight),
          },
          {
            level: Levels.PROPERTY,
            type: 'sensor',
            valueType: ValueType.BOOLEAN,
          }
        ),
        isNight: addMeta(
          {
            _get: new ReadOnlyObservable(isNight),
          },
          {
            level: Levels.PROPERTY,
            type: 'sensor',
            valueType: ValueType.BOOLEAN,
          }
        ),
      },
      {
        level: Levels.PROPERTY,
        measured: 'sunElevation',
        type: 'sensor',
        unit: 'deg',
        valueType: ValueType.NUMBER,
      }
    ),
  };
};
