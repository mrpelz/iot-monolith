/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  AnyObservable,
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
} from '../main-ng.js';

const $ = Symbol('setter');

export const setter = <N extends string, T extends string, V extends ValueType>(
  valueType: V,
  setState: AnyWritableObservable<TValueType[V]>,
  state?: AnyObservable<TValueType[V] | null>,
  name?: N,
  topic?: T
) =>
  new Element({
    $,
    level: Level.PROPERTY,
    name,
    setState,
    state,
    topic,
    valueType,
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
  $: [matchValue, $] as const,
  level: [matchValue, Level.PROPERTY] as const,
  name: [matchValue, name] as const,
  setState: [matchClass, Observable, ProxyObservable] as const,
  topic: [matchValue, topic] as const,
  valueType: [matchValue, valueType] as const,
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
