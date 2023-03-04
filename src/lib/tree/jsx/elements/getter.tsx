import {
  AnyReadOnlyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../../observable.js';
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

export const Getter = <T extends ValueType>({
  children,
  ...props
}: {
  children?: Children;
  init?: InitFunction;
  measured?: string;
  name: string;
  state: AnyReadOnlyObservable<TValueType[T] | null>;
  unit?: string;
  valueType: T;
}) => (
  <element {...props} level={Level.PROPERTY} type="getter">
    {children}
  </element>
);

export const selectGetter = <
  T extends ValueType,
  M extends string,
  U extends string,
  N extends string
>(
  valueType: T,
  measured?: M,
  unit?: U,
  name?: N
): MatcherFunctionMap<{
  level: Level.PROPERTY;
  measured?: M;
  name?: N;
  state:
    | typeof ReadOnlyObservable<TValueType[T] | null>
    | typeof ReadOnlyProxyObservable<unknown, TValueType[T] | null>;
  type: 'getter';
  unit?: U;
  valueType: T;
}> => ({
  level: [matchValue, Level.PROPERTY],
  measured: [matchValue, measured],
  name: [matchValue, name],
  state: [matchClass, ReadOnlyObservable, ReadOnlyProxyObservable],
  type: [matchValue, 'getter'],
  unit: [matchValue, unit],
  valueType: [matchValue, valueType],
});
