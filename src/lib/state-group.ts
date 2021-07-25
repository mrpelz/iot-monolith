import {
  AnyObservable,
  ReadOnlyObservable,
  combineObservables,
} from './observable.js';

export enum BooleanGroupStrategy {
  IS_TRUE_IF_ALL_TRUE,
  IS_TRUE_IF_SOME_TRUE,
}

export function combineBooleanState(
  strategy: BooleanGroupStrategy,
  initialValue: boolean,
  ...states: AnyObservable<boolean>[]
): ReadOnlyObservable<boolean> {
  return combineObservables(
    (...values) => {
      return strategy === BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE
        ? !values.includes(false)
        : values.includes(true);
    },
    initialValue,
    ...states
  );
}
