/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  AnyReadOnlyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../observable.js';
import {
  Level,
  TValueType,
  ValueType,
  element,
  matchClass,
  matchValue,
  symbolInstance,
  symbolLevel,
  symbolSpecies,
  symbolValueType,
} from '../main.js';

const $ = Symbol('getter');

export const getter = <N extends string, U extends string, V extends ValueType>(
  valueType: V,
  state: AnyReadOnlyObservable<TValueType[V] | null>,
  unit?: U,
  name?: N
) =>
  element({
    name,
    [symbolInstance]: state,
    [symbolLevel]: Level.ELEMENT as const,
    [symbolSpecies]: $,
    [symbolValueType]: valueType,
    unit,
  });

export const selectGetter = <
  V extends ValueType,
  N extends string,
  U extends string
>(
  valueType: V,
  unit?: U,
  name?: N
) => ({
  name: [matchValue, name] as const,
  [symbolInstance]: [
    matchClass,
    ReadOnlyObservable,
    ReadOnlyProxyObservable,
  ] as const,
  [symbolLevel]: [matchValue, Level.ELEMENT] as const,
  [symbolSpecies]: [matchValue, $] as const,
  [symbolValueType]: [matchValue, valueType] as const,
  unit: [matchValue, unit] as const,
});
