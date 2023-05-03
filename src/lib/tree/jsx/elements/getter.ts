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
  matchClass,
  matchValue,
} from '../main.js';

export type GetterProps<
  N extends string,
  T extends string,
  U extends string,
  V extends ValueType
> = {
  name: N;
  state: AnyReadOnlyObservable<TValueType[V] | null>;
  topic?: T;
  unit?: U;
  valueType: V;
};

export class Getter<
  N extends string,
  T extends string,
  U extends string,
  V extends ValueType,
  C extends Children
> extends Element<GetterProps<N, T, U, V>> {
  constructor(
    props: GetterProps<N, T, U, V>,
    init?: InitFunction,
    children?: C
  ) {
    super({ ...props, level: Level.PROPERTY }, init, children);
  }
}

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
  level: Level.PROPERTY;
  name?: N;
  state:
    | typeof ReadOnlyObservable<TValueType[V] | null>
    | typeof ReadOnlyProxyObservable<unknown, TValueType[V] | null>;
  topic?: T;
  unit?: U;
  valueType: V;
}> => ({
  level: [matchValue, Level.PROPERTY],
  name: [matchValue, name],
  state: [matchClass, ReadOnlyObservable, ReadOnlyProxyObservable],
  topic: [matchValue, topic],
  unit: [matchValue, unit],
  valueType: [matchValue, valueType],
});
