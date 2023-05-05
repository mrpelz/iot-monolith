/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  AnyReadOnlyObservable,
  AnyWritableObservable,
  Observable,
  ProxyObservable,
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

const $ = Symbol('setter');

export const setter = <N extends string, T extends string, V extends ValueType>(
  valueType: V,
  setState: AnyWritableObservable<TValueType[V]>,
  state?: AnyReadOnlyObservable<TValueType[V] | null>,
  name?: N,
  topic?: T
) =>
  new Element({
    name,
    setState,
    state,
    [symbolLevel]: Level.ELEMENT as const,
    [symbolSpecies]: $,
    [symbolValueType]: valueType,
    topic,
  });

export const selectSetter = <
  V extends ValueType,
  N extends string,
  T extends string
>(
  valueType: V,
  name?: N,
  topic?: T
) => ({
  name: [matchValue, name] as const,
  setState: [matchClass, Observable, ProxyObservable] as const,
  [symbolLevel]: [matchValue, Level.ELEMENT] as const,
  [symbolSpecies]: [matchValue, $] as const,
  [symbolValueType]: [matchValue, valueType] as const,
  topic: [matchValue, topic] as const,
});

export const selectGetterSetter = <
  V extends ValueType,
  N extends string,
  T extends string
>(
  valueType: V,
  name?: N,
  topic?: T
) => ({
  ...selectSetter(valueType, name, topic),
  state: [matchClass, ReadOnlyObservable, ReadOnlyProxyObservable] as const,
});
