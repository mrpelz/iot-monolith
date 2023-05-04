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
    $,
    level: Level.PROPERTY,
    name,
    state,
    topic,
    unit,
    valueType,
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
  $: [matchValue, $] as const,
  level: [matchValue, Level.PROPERTY] as const,
  name: [matchValue, name] as const,
  state: [matchClass, ReadOnlyObservable, ReadOnlyProxyObservable] as const,
  topic: [matchValue, topic] as const,
  unit: [matchValue, unit] as const,
  valueType: [matchValue, valueType] as const,
});
