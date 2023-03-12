import {
  AnyReadOnlyObservable,
  Observable,
  ReadOnlyObservable,
} from '../../../../observable.js';
import { Element, ValueType, h, matchValue } from '../../main.js';
import { Getter, selectGetter } from '../getter.js';

export type LastChangeProps<T> = {
  state: AnyReadOnlyObservable<T>;
};

const $lastChange = Symbol('lastChange');

export const LastChange = <T,>({ state }: LastChangeProps<T>) => {
  const seen = new Observable<number | null>(null);

  state.observe((value) => {
    if (value === null) return;

    seen.value = Date.now();
  });

  return (
    <Getter
      $lastChange={$lastChange}
      name="lastChange"
      state={new ReadOnlyObservable(seen)}
      unit="date"
      valueType={ValueType.NUMBER}
    />
  );
};

export const selectorLastChange$ = {
  ...selectGetter(ValueType.NUMBER, undefined, undefined, 'date'),
  $lastChange: [matchValue, $lastChange] as const,
};

export const matchLastChange = (input: Element) => {
  if (!input.match(selectorLastChange$)) return undefined;

  return {
    $: input,
  };
};
