/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  Element,
  Level,
  TValueType,
  ValueType,
  matchClass,
  matchValue,
  symbolInstance,
  symbolLevel,
  symbolSpecies,
  symbolValueType,
} from '../main-ng.js';
import { NullState, ReadOnlyNullState } from '../../state.js';

const $ = Symbol('trigger');

export const trigger = <N extends string, V extends ValueType>(
  valueType: V,
  nullState: NullState<TValueType[V]>,
  name?: N
) =>
  new Element({
    name,
    [symbolInstance]: nullState,
    [symbolLevel]: Level.ELEMENT as const,
    [symbolSpecies]: $,
    [symbolValueType]: valueType,
  });

export const selectTrigger = <N extends string, V extends ValueType>(
  valueType: V,
  name?: N
) => ({
  name: [matchValue, name] as const,
  [symbolInstance]: [matchClass, ReadOnlyNullState] as const,
  [symbolLevel]: [matchValue, Level.ELEMENT] as const,
  [symbolSpecies]: [matchValue, $],
  [symbolValueType]: [matchValue, valueType] as const,
});
