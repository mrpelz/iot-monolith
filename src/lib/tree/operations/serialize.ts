import { Element, TElement } from '../main.js';
import { isNullState } from '../../state.js';
import { isObservable } from '../../observable.js';

export const serialize = (source: TElement): string =>
  JSON.stringify(
    source,
    (key, value) => {
      if (value === null) return value;

      if (['boolean', 'number', 'string', 'undefined'].includes(typeof value)) {
        return value;
      }

      if (value instanceof Element) return value.props;

      if (isObservable(value)) {
        return '<Observable>';
      }

      if (isNullState(value)) {
        return '<NullState>';
      }

      if (key === 'internal' && typeof value === 'object') return value;

      return undefined;
    },
    2
  );
