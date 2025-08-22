import { AnyWritableObservable } from '@mrpelz/observable';
import { NullState } from '@mrpelz/observable/state';

export const getMain = <T>(subject: {
  main: { setState: AnyWritableObservable<T> };
}): T => subject.main.setState.value;

export const setMain = <T>(
  subject: { main: { setState: AnyWritableObservable<T> } },
  value: T,
  then?: (value: T) => unknown,
): void => {
  then?.(value);
  subject.main.setState.value = value;
};

export const triggerMain = (
  subject: { main: { setState: NullState } },
  then?: () => unknown,
): void => {
  then?.();
  subject.main.setState.trigger();
};

export const flipMain = (
  subject: { flip: { setState: NullState } },
  then?: () => unknown,
): void => {
  then?.();
  subject.flip.setState.trigger();
};
