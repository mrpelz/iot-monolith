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
  h,
  matchClass,
  matchValue,
} from '../main.js';

const $setter = Symbol('setter');

export type SetterProps<V extends ValueType> = {
  children?: Children;
  init?: InitFunction;
  name: string;
  setState: AnyWritableObservable<TValueType[V]>;
  state?: AnyObservable<TValueType[V] | null>;
  topic?: string;
  valueType: V;
} & Record<`$${string}`, symbol>;

export type TSetter<V extends ValueType, S extends boolean> = Element<
  SetterProps<V> & {
    $setter: typeof $setter;
    level: Level.PROPERTY;
    state: S extends true
      ? Exclude<SetterProps<V>['state'], undefined>
      : undefined;
  }
>;

export const Setter = <V extends ValueType>({
  children,
  ...props
}: SetterProps<V>) =>
  (
    <element {...props} $setter={$setter} level={Level.PROPERTY}>
      {children}
    </element>
  ) as TSetter<V, (typeof props)['state'] extends undefined ? false : true>;

export const selectSetter = <
  V extends ValueType,
  N extends string,
  T extends string
>(
  valueType: V,
  name?: N,
  topic?: T
): MatcherFunctionMap<{
  $setter: typeof $setter;
  level: Level.PROPERTY;
  name?: N;
  setState:
    | typeof Observable<TValueType[V]>
    | typeof ProxyObservable<unknown, TValueType[V]>;
  topic?: T;
  valueType: V;
}> => ({
  $setter: [matchValue, $setter],
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
  $setter: typeof $setter;
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
  $setter: [matchValue, $setter],
  level: [matchValue, Level.PROPERTY],
  name: [matchValue, name],
  setState: [matchClass, Observable, ProxyObservable],
  state: [matchClass, ReadOnlyObservable, ReadOnlyProxyObservable],
  topic: [matchValue, topic],
  valueType: [matchValue, valueType],
});
