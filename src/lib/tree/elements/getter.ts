/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  AnyReadOnlyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import {
  Element,
  Level,
  TValueType,
  ValueType,
  matchClass,
  matchValue,
  symbolLevel,
  symbolSpecies,
  symbolValueType,
} from '../main-ng.js';

const $ = Symbol('getter');

export const getter = <
  N extends string,
  T extends string,
  U extends string,
  V extends ValueType
>(
  valueType: V,
  state: AnyReadOnlyObservable<TValueType[V] | null>,
  name?: N,
  unit?: U,
  topic?: T
) =>
  new Element({
    name,
    state,
    [symbolLevel]: Level.ELEMENT as const,
    [symbolSpecies]: $,
    [symbolValueType]: valueType,
    topic,
    unit,
  });

export const selectGetter = <
  V extends ValueType,
  N extends string,
  T extends string,
  U extends string
>(
  valueType: V,
  name?: N,
  topic?: T,
  unit?: U
) => ({
  name: [matchValue, name] as const,
  state: [matchClass, ReadOnlyObservable, ReadOnlyProxyObservable] as const,
  [symbolLevel]: [matchValue, Level.ELEMENT] as const,
  [symbolSpecies]: [matchValue, $] as const,
  [symbolValueType]: [matchValue, valueType] as const,
  topic: [matchValue, topic] as const,
  unit: [matchValue, unit] as const,
});
