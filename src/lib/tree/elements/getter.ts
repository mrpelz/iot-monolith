/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { AnyReadOnlyObservable } from '../../observable.js';
import { Element, Level, TValueType, ValueType } from '../main.js';

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
) =>
  new Element({
    $,
    level: Level.ELEMENT as const,
    name,
    state,
    unit,
    valueType,
  });

export type Getter = ReturnType<typeof getter>;

export const isGetter = (input: unknown): input is Getter => {
  if (!(input instanceof Element)) return false;
  if (!input.match({ $ })) return false;

  return true;
};
