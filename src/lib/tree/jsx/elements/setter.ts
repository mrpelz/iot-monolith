import {
  AnyObservable,
  AnyWritableObservable,
  Observable,
  ProxyObservable,
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

export type SetterProps<
  N extends string,
  T extends string,
  V extends ValueType
> = {
  name: N;
  setState: AnyWritableObservable<TValueType[V]>;
  state?: AnyObservable<TValueType[V] | null>;
  topic?: T;
  valueType: V;
};

export class Setter<
  N extends string,
  T extends string,
  V extends ValueType,
  C extends Children
> extends Element<SetterProps<N, T, V>> {
  constructor(props: SetterProps<N, T, V>, init?: InitFunction, children?: C) {
    super({ ...props, level: Level.PROPERTY }, init, children);
  }
}

export const selectSetter = <
  V extends ValueType,
  N extends string,
  T extends string
>(
  valueType: V,
  name?: N,
  topic?: T
): MatcherFunctionMap<{
  level: Level.PROPERTY;
  name?: N;
  setState:
    | typeof Observable<TValueType[V]>
    | typeof ProxyObservable<unknown, TValueType[V]>;
  topic?: T;
  valueType: V;
}> => ({
  level: [matchValue, Level.PROPERTY],
  name: [matchValue, name],
  setState: [matchClass, Observable, ProxyObservable],
  topic: [matchValue, topic],
  valueType: [matchValue, valueType],
});

export const selectGetterSetter = <
  V extends ValueType,
  N extends string,
  T extends string
>(
  valueType: V,
  name?: N,
  topic?: T
): MatcherFunctionMap<{
  level: Level.PROPERTY;
  name?: N;
  setState:
    | typeof Observable<TValueType[V]>
    | typeof ProxyObservable<unknown, TValueType[V]>;
  state:
    | typeof ReadOnlyObservable<TValueType[V] | null>
    | typeof ReadOnlyProxyObservable<unknown, TValueType[V] | null>;
  topic?: T;
  valueType: V;
}> => ({
  ...selectSetter(valueType, name, topic),
  state: [matchClass, ReadOnlyObservable, ReadOnlyProxyObservable],
});
