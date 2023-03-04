import {
  Children,
  InitFunction,
  Level,
  MatcherFunctionMap,
  TValueType,
  ValueType,
  h,
  matchClass,
  matchValue,
} from '../main.js';
import {
  Observable,
  ProxyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../../observable.js';
import { NullState } from '../../../state.js';

export const Trigger = <T extends ValueType>({
  children,
  ...props
}: {
  actuated?: string;
  children?: Children;
  init?: InitFunction;
  name: string;
  trigger: NullState<TValueType[T]>;
  valueType: T;
}) => (
  <element {...props} level={Level.PROPERTY} type="trigger">
    {children}
  </element>
);

export const selectSetter = <
  T extends ValueType,
  A extends string,
  N extends string
>(
  valueType: T,
  actuated?: A,
  name?: N
): MatcherFunctionMap<{
  actuated?: A;
  level: Level.PROPERTY;
  name?: N;
  setState:
    | typeof Observable<TValueType[T]>
    | typeof ProxyObservable<unknown, TValueType[T]>;
  state?:
    | typeof ReadOnlyObservable<TValueType[T] | null>
    | typeof ReadOnlyProxyObservable<unknown, TValueType[T] | null>;
  type: 'setter';
  valueType: T;
}> => ({
  actuated: [matchValue, actuated],
  level: [matchValue, Level.PROPERTY],
  name: [matchValue, name],
  setState: [matchClass, Observable, ProxyObservable],
  state: [matchClass, ReadOnlyObservable, ReadOnlyProxyObservable, undefined],
  type: [matchValue, 'setter'],
  valueType: [matchValue, valueType],
});
