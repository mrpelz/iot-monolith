/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  Element,
  Level,
  TValueType,
  ValueType,
  matchClass,
  matchValue,
  symbolLevel,
  symbolSpecies,
  symbolValueType,
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
    name,
    nullState,
    [symbolLevel]: Level.ELEMENT as const,
    [symbolSpecies]: $,
    [symbolValueType]: valueType,
    topic,
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
  name: [matchValue, name] as const,
  nullState: [matchClass, ReadOnlyNullState] as const,
  [symbolLevel]: [matchValue, Level.ELEMENT] as const,
  [symbolSpecies]: [matchValue, $],
  [symbolValueType]: [matchValue, valueType] as const,
  topic: [matchValue, topic] as const,
});
