import {
  Children,
  Element,
  InitFunction,
  Level,
  MatcherFunctionMap,
  TValueType,
  ValueType,
  matchClass,
  matchValue,
} from '../main.js';
import { NullState, ReadOnlyNullState } from '../../../state.js';

export type TriggerProps<
  N extends string,
  T extends string,
  V extends ValueType
> = {
  name: N;
  nullState: NullState<TValueType[V]>;
  topic?: T;
  valueType: V;
};

export class Trigger<
  N extends string,
  T extends string,
  V extends ValueType,
  C extends Children
> extends Element<TriggerProps<N, T, V>> {
  constructor(props: TriggerProps<N, T, V>, init?: InitFunction, children?: C) {
    super({ ...props, level: Level.PROPERTY }, init, children);
  }
}

export const selectTrigger = <
  N extends string,
  T extends string,
  V extends ValueType
>(
  valueType: V,
  name?: N,
  topic?: T
): MatcherFunctionMap<{
  level: Level.PROPERTY;
  name?: N;
  nullState: typeof ReadOnlyNullState<TValueType[V]>;
  topic?: T;
  valueType: V;
}> => ({
  level: [matchValue, Level.PROPERTY],
  name: [matchValue, name],
  nullState: [matchClass, ReadOnlyNullState],
  topic: [matchValue, topic],
  valueType: [matchValue, valueType],
});
