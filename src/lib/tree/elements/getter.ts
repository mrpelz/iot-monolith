/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Element, Level, TValueType, ValueType } from '../main.js';
import { AnyReadOnlyObservable } from '../../observable.js';

export const getter = <
  N extends string | undefined,
  U extends string | undefined,
  V extends ValueType
>(
  valueType: V,
  state: AnyReadOnlyObservable<TValueType[V] | null>,
  unit: U = undefined as U,
  name: N = undefined as N
) =>
  new Element({
    $: 'getter' as const,
    level: Level.ELEMENT as const,
    name,
    state,
    unit,
    valueType,
  });

export type Getter = ReturnType<typeof getter>;
