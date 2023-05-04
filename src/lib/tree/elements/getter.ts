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

export type GetterProps<
  N extends string,
  T extends string,
  U extends string,
  V extends ValueType
> = {
  name: N;
  state: AnyReadOnlyObservable<TValueType[V] | null>;
  topic?: T;
  unit?: U;
  valueType: V;
};

export const getter = <
  N extends string,
  T extends string,
  U extends string,
  V extends ValueType
>(
  props: GetterProps<N, T, U, V>
) => new Element({ ...props, $, level: Level.PROPERTY });

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
