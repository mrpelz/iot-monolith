/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { isObject } from '../../oop.js';
import { NullState } from '../../state.js';
import { isLocalMatch, Level, TValueType, ValueType } from '../main.js';

export const $ = 'trigger' as const;

export const trigger = <N extends string | undefined, V extends ValueType>(
  valueType: V,
  nullState: NullState<TValueType[V]>,
  name: N = undefined as N,
) => ({
  $,
  level: Level.ELEMENT as const,
  name,
  setState: nullState,
  valueType,
});

export type Trigger = ReturnType<typeof trigger>;

export const isTrigger = (input: unknown): input is Trigger => {
  if (!isObject(input)) return false;
  if (!isLocalMatch({ $ }, input)) return false;

  return true;
};
