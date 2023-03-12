import { Element, ValueType, h, matchValue } from '../../main.js';
import { Getter, selectGetter } from '../getter.js';
import { Observable, ReadOnlyObservable } from '../../../../observable.js';
import { ReadOnlyNullState } from '../../../../state.js';

export type LastSeenProps<T> = {
  state: ReadOnlyObservable<T> | ReadOnlyNullState<T>;
};

const $lastSeen = Symbol('lastSeen');

export const LastSeen = <T,>({ state }: LastSeenProps<T>) => {
  const seen = new Observable<number | null>(null);

  state.observe((value) => {
    if (state instanceof ReadOnlyObservable && value === null) return;

    seen.value = Date.now();
  }, true);

  return (
    <Getter
      $lastSeen={$lastSeen}
      name="lastSeen"
      state={new ReadOnlyObservable(seen)}
      unit="date"
      valueType={ValueType.NUMBER}
    />
  );
};

export const selectorLastSeen$ = {
  ...selectGetter(ValueType.NUMBER, undefined, undefined, 'date'),
  $lastSeen: [matchValue, $lastSeen] as const,
};

export const matchLastSeen = (input: Element) => {
  if (!input.match(selectorLastSeen$)) return undefined;

  return {
    $: input,
  };
};
