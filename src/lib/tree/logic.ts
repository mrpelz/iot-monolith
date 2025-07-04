import { AnyWritableObservable } from '../observable.js';
import { NullState } from '../state.js';

export const getMain = <T>(subject: {
  main: { setState: AnyWritableObservable<T> };
}): T => subject.main.setState.value;

export const setMain = <T>(
  subject: { main: { setState: AnyWritableObservable<T> } },
  value: T,
  then?: (value: T) => unknown,
): void => {
  subject.main.setState.value = value;
  then?.(value);
};

export const flipMain = (
  subject: { flip: { setState: NullState } },
  then?: () => unknown,
): void => {
  subject.flip.setState.trigger();
  then?.();
};
