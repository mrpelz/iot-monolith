import {
  AnyReadOnlyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../../observable.js';
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

const $getter = Symbol('getter');

export type GetterProps<V extends ValueType> = {
  children?: Children;
  init?: InitFunction;
  name: string;
  state: AnyReadOnlyObservable<TValueType[V] | null>;
  topic?: string;
  unit?: string;
  valueType: V;
} & Record<`$${string}`, symbol>;

export type TGetter<V extends ValueType> = Element<
  GetterProps<V> & {
    $getter: typeof $getter;
    level: Level.PROPERTY;
  }
>;

export const Getter = <V extends ValueType>({
  children,
  ...props
}: GetterProps<V>) =>
  (
    <element {...props} $getter={$getter} level={Level.PROPERTY}>
      {children}
    </element>
  ) as TGetter<V>;

export const selectGetter = <
  V extends ValueType,
  N extends string,
  T extends string,
  U extends string
>(
  valueType: V,
  name?: N,
  topic?: T,
  unit?: U
): MatcherFunctionMap<{
  $getter: typeof $getter;
  level: Level.PROPERTY;
  name?: N;
  state:
    | typeof ReadOnlyObservable<TValueType[V] | null>
    | typeof ReadOnlyProxyObservable<unknown, TValueType[V] | null>;
  topic?: T;
  unit?: U;
  valueType: V;
}> => ({
  $getter: [matchValue, $getter],
  level: [matchValue, Level.PROPERTY],
  name: [matchValue, name],
  state: [matchClass, ReadOnlyObservable, ReadOnlyProxyObservable],
  topic: [matchValue, topic],
  unit: [matchValue, unit],
  valueType: [matchValue, valueType],
});
