/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { AnyReadOnlyObservable } from '../../observable.js';
import { isObject } from '../../oop.js';
import { isLocalMatch, Level, TValueType, ValueType } from '../main.js';

export const $ = 'getter' as const;

export const getter = <
  N extends string | undefined,
  U extends string | undefined,
  V extends ValueType,
>(
  valueType: V,
  state: AnyReadOnlyObservable<TValueType[V] | null>,
  unit: U = undefined as U,
  name: N = undefined as N,
) => ({
  $,
  level: Level.ELEMENT as const,
  name,
  state,
  unit,
  valueType,
});

export type Getter = ReturnType<typeof getter>;

export const isGetter = (input: unknown): input is Getter => {
  if (!isObject(input)) return false;
  if (!isLocalMatch({ $ }, input)) return false;

  return true;
};
