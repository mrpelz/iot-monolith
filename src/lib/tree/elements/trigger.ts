/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  Element,
  Level,
  TValueType,
  ValueType,
  matchClass,
  matchValue,
} from '../main-ng.js';
import { NullState, ReadOnlyNullState } from '../../state.js';

const $ = Symbol('trigger');

export type TriggerProps<
  N extends string,
  T extends string,
  V extends ValueType
> = {
  name?: N;
  nullState: NullState<TValueType[V]>;
  topic?: T;
  valueType: V;
};

export const trigger = <
  N extends string,
  T extends string,
  V extends ValueType
>(
  props: TriggerProps<N, T, V>
) => new Element({ ...props, $, level: Level.PROPERTY });

export const selectTrigger = <
  N extends string,
  T extends string,
  V extends ValueType
>(
  valueType: V,
  name?: N,
  topic?: T
) => ({
  $: [matchValue, $],
  level: [matchValue, Level.PROPERTY] as const,
  name: [matchValue, name] as const,
  nullState: [matchClass, ReadOnlyNullState] as const,
  topic: [matchValue, topic] as const,
  valueType: [matchValue, valueType] as const,
});
