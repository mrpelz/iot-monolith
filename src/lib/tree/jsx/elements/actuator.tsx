import { AnyWritableObservable, Observable } from '../../../observable.js';
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

export const Actuator = <T extends ValueType>(props: {
  actuated?: string;
  name: string;
  observable: AnyWritableObservable<TValueType[T]>;
  valueType: T;
}): Element => <element {...props} level={Level.PROPERTY} type="actuator" />;

export const selectActuator = <
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
  observable: typeof Observable<TValueType[T]>;
  type: 'actuator';
  valueType: T;
}> => ({
  actuated: [matchValue, actuated],
  level: [matchValue, Level.PROPERTY],
  name: [matchValue, name],
  observable: [matchClass, Observable],
  type: [matchValue, 'actuator'],
  valueType: [matchValue, valueType],
});
