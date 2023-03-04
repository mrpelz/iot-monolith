import {
  Element,
  Level,
  MatcherFunctionMap,
  TValueType,
  ValueType,
  h,
  matchClass,
  matchValue,
} from '../main.js';
import { ReadOnlyObservable } from '../../../observable.js';

export const Sensor = <T extends ValueType>(props: {
  measured?: string;
  name: string;
  observable: ReadOnlyObservable<TValueType[T]>;
  unit?: string;
  valueType: T;
}): Element => <element {...props} level={Level.PROPERTY} type="sensor" />;

export const selectSensor = <
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
  observable: typeof ReadOnlyObservable<TValueType[T]>;
  type: 'sensor';
  unit?: U;
  valueType: T;
}> => ({
  level: [matchValue, Level.PROPERTY],
  measured: [matchValue, measured],
  name: [matchValue, name],
  observable: [matchClass, ReadOnlyObservable],
  type: [matchValue, 'sensor'],
  unit: [matchValue, unit],
  valueType: [matchValue, valueType],
});
