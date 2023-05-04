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

export const trigger = <
  N extends string,
  T extends string,
  V extends ValueType
>(
  valueType: V,
  nullState: NullState<TValueType[V]>,
  name?: N,
  topic?: T
) =>
  new Element({
    $,
    level: Level.PROPERTY,
    name,
    nullState,
    topic,
    valueType,
  });

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
