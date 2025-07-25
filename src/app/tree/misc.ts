/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Metrics } from '../../lib/metrics.js';
import { Observable, ReadOnlyObservable } from '../../lib/observable.js';
import { Schedule } from '../../lib/schedule.js';
import { getter } from '../../lib/tree/elements/getter.js';
import { Level, ValueType } from '../../lib/tree/main.js';
import { InitFunction } from '../../lib/tree/operations/init.js';
import { metrics } from '../metrics.js';
import { persistence } from '../persistence.js';
import {
  isAstronomicalTwilight as isAstronomicalTwilightUtil,
  isCivilTwilight as isCivilTwilightUtil,
  isDay as isDayUtil,
  isNauticalTwilight as isNauticalTwilightUtil,
  isNight as isNightUtil,
  sunElevation as sunElevationUtil,
} from '../util.js';

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

export const sunElevation = (schedule: Schedule) => {
  const $ = 'sunElevation' as const;

  const elevation = new Observable(getValues().elevation);
  const readOnlyElevation = new ReadOnlyObservable(elevation);

  const isAstronomicalTwilight = new Observable(
    getValues().isAstronomicalTwilight,
  );
  const readOnlyIsAstronomicalTwilight = new ReadOnlyObservable(
    isAstronomicalTwilight,
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

  const $init: InitFunction = (self, introspection) => {
    const { mainReference } = introspection.getObject(self) ?? {};
    if (!mainReference) return;

    persistence.observe(mainReference.pathString, elevation);

    const labels = Metrics.hierarchyLabels(introspection, self);
    if (!labels) return;

    metrics.addMetric(
      $,
      readOnlyElevation,
      {
        unit: 'degrees',
        ...labels,
      },
      'sun elevation angle in degrees',
    );

    metrics.addMetric(
      `${$}_isAstronomicalTwilight`,
      readOnlyIsAstronomicalTwilight,
      labels,
    );
    metrics.addMetric(`${$}_isCivilTwilight`, readOnlyIsCivilTwilight, labels);
    metrics.addMetric(`${$}_isDay`, readOnlyIsDay, labels);
    metrics.addMetric(
      `${$}_isNauticalTwilight`,
      readOnlyIsNauticalTwilight,
      labels,
    );
    metrics.addMetric(`${$}_isNight`, readOnlyIsNight);
  };

  return {
    sunElevation: {
      $,
      $exclude: false as const,
      $init,
      isAstronomicalTwilight: getter(
        ValueType.BOOLEAN,
        readOnlyIsAstronomicalTwilight,
      ),
      isCivilTwilight: getter(ValueType.BOOLEAN, readOnlyIsCivilTwilight),
      isDay: getter(ValueType.BOOLEAN, readOnlyIsDay),
      isNauticalTwilight: getter(ValueType.BOOLEAN, readOnlyIsNauticalTwilight),
      isNight: getter(ValueType.BOOLEAN, readOnlyIsNight),
      level: Level.PROPERTY as const,
      main: getter(ValueType.NUMBER, readOnlyElevation),
    },
  };
};
