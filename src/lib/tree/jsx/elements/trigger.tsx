import {
  Children,
  Element,
  InitFunction,
  Level,
  MatcherFunctionMap,
  TValueType,
  ValueType,
  h,
  matchClass,
  matchValue,
} from '../main.js';
import { NullState, ReadOnlyNullState } from '../../../state.js';

const $trigger = Symbol('trigger');

export type TriggerProps<V extends ValueType> = {
  children?: Children;
  init?: InitFunction;
  name: string;
  nullState: NullState<TValueType[V]>;
  topic?: string;
  valueType: V;
} & Record<`$${string}`, symbol>;

export type TTrigger<V extends ValueType> = Element<
  TriggerProps<V> & {
    $trigger: typeof $trigger;
    level: Level.PROPERTY;
  }
>;

export const Trigger = <V extends ValueType>({
  children,
  ...props
}: TriggerProps<V>) =>
  (
    <element {...props} $trigger={$trigger} level={Level.PROPERTY}>
      {children}
    </element>
  ) as TTrigger<V>;

export const selectTrigger = <
  V extends ValueType,
  N extends string,
  T extends string
>(
  valueType: V,
  name?: N,
  topic?: T
): MatcherFunctionMap<{
  $trigger: typeof $trigger;
  level: Level.PROPERTY;
  name?: N;
  nullState: typeof ReadOnlyNullState<TValueType[V]>;
  topic?: T;
  valueType: V;
}> => ({
  $trigger: [matchValue, $trigger],
  level: [matchValue, Level.PROPERTY],
  name: [matchValue, name],
  nullState: [matchClass, ReadOnlyNullState],
  topic: [matchValue, topic],
  valueType: [matchValue, valueType],
});
