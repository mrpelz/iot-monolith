/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Element, Level, TValueType, ValueType } from '../main.js';
import { NullState } from '../../state.js';

export const trigger = <N extends string | undefined, V extends ValueType>(
  valueType: V,
  nullState: NullState<TValueType[V]>,
  name: N = undefined as N
) =>
  new Element({
    $: 'trigger' as const,
    level: Level.ELEMENT as const,
    name,
    state: nullState,
    valueType,
  });

export type Trigger = ReturnType<typeof trigger>;
