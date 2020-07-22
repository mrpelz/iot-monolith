import { Type } from '../src/lib/aggregate/index.js';

export default [
  {
    attributes: {
      hmi: {},
    },
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'global',
    sensors: [
      'wohnzimmer',
      'esszimmer',
      'kueche',
      'schlafzimmer',
      'arbeitszimmer',
      'flur',
      'abstellraum',
      'duschbad',
      'wannenbad',
      'terrasse',
      'balkon',
    ],
    type: Type.Mean,
  },
  {
    attributes: {
      hmi: {},
    },
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'innen',
    sensors: [
      'wohnzimmer',
      'esszimmer',
      'kueche',
      'schlafzimmer',
      'arbeitszimmer',
      'flur',
      'abstellraum',
      'duschbad',
      'wannenbad',
    ],
    type: Type.Mean,
  },
  {
    attributes: {
      hmi: {},
    },
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'aussen',
    sensors: ['terrasse', 'balkon'],
    type: Type.Mean,
  },
  {
    attributes: {
      hmi: {},
    },
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'global',
    sensors: [
      'wohnzimmer',
      'esszimmer',
      'kueche',
      'schlafzimmer',
      'arbeitszimmer',
      'flur',
      'abstellraum',
      'duschbad',
      'wannenbad',
      'terrasse',
      'balkon',
    ],
    type: Type.Median,
  },
  {
    attributes: {
      hmi: {},
    },
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'innen',
    sensors: [
      'wohnzimmer',
      'esszimmer',
      'kueche',
      'schlafzimmer',
      'arbeitszimmer',
      'flur',
      'abstellraum',
      'duschbad',
      'wannenbad',
    ],
    type: Type.Median,
  },
  {
    attributes: {
      hmi: {},
    },
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'aussen',
    sensors: ['terrasse', 'balkon'],
    type: Type.Median,
  },
];
