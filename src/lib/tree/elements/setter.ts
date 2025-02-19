/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  AnyReadOnlyObservable,
  AnyWritableObservable,
  ReadOnlyObservable,
} from '../../observable.js';
import { isObject } from '../../oop.js';
import { isLocalMatch, Level, TValueType, ValueType } from '../main.js';

export const $ = 'setter' as const;

export const setter = <N extends string | undefined, V extends ValueType>(
  valueType: V,
  setState: AnyWritableObservable<TValueType[V]>,
  state: AnyReadOnlyObservable<TValueType[V] | null> | undefined = undefined,
  name: N = undefined as N,
) => ({
  $,
  level: Level.ELEMENT as const,
  name,
  setState,
  state: state || new ReadOnlyObservable(setState),
  valueType,
});

export type Setter = ReturnType<typeof setter>;

export const isSetter = (input: unknown): input is Setter => {
  if (!isObject(input)) return false;
  if (!isLocalMatch({ $ }, input)) return false;

  return true;
};
