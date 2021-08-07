/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ReadOnlyObservable } from './observable.js';

type MetaKeys = 'actuator' | 'name' | 'metric' | 'type' | 'unit';
export type Meta = Partial<Record<MetaKeys, string>>;

export const metadataStore = new WeakMap<object, Meta>();
const states = new Map<any, number>();
const setters = new Map<any, number>();

const getStateIndex = (() => {
  let index = 0;

  return (value: unknown) => {
    const entry = states.get(value);
    if (entry !== undefined) return entry;

    const entryIndex = index;
    states.set(value, entryIndex);

    index += 1;

    return entryIndex;
  };
})();

const getSetterIndex = (() => {
  let index = 0;

  return (value: unknown) => {
    const entry = setters.get(value);
    if (entry !== undefined) return entry;

    const entryIndex = index;
    setters.set(value, entryIndex);

    index += 1;

    return entryIndex;
  };
})();

export function hierarchyToObject(input: any) {
  const serialize = (object: any, parentMeta?: Meta): any => {
    if (typeof object !== 'object') return undefined;

    const _meta = (() => {
      return {
        ...parentMeta,
        name: undefined,
        ...(metadataStore.get(object) || undefined),
      };
    })();

    const nodes = (() => {
      return Object.fromEntries(
        Object.entries(object)
          .filter(([key]) => !['$', '_get', '_set'].includes(key))
          .map(([key, node]) => [key, serialize(node, _meta)])
      );
    })();

    const _get = (() => {
      if (!('_get' in object)) return undefined;
      if (!(object._get instanceof ReadOnlyObservable)) return undefined;

      return getStateIndex(object._get);
    })();

    const _set = (() => {
      if (!('_set' in object)) return undefined;
      return getSetterIndex(object._set);
    })();

    return {
      _get,
      _meta,
      _set,
      ...nodes,
    };
  };

  const values = () =>
    Array.from(states.entries()).map(([state, index]) => [index, state.value]);

  return {
    structure: serialize(input),
    values,
  };
}

interface Dictionary<O extends object = {}> {
  readonly size: number;
  get<K extends keyof O>(key: K): O[K];
  set<K extends PropertyKey, V>(
    key: Exclude<K, keyof O>,
    value: V
  ): asserts this is Dictionary<
    { [P in K | keyof O]: P extends K ? V : P extends keyof O ? O[P] : V }
  >;
  set<K extends keyof O>(key: K, value: O[K]): void;
}
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const Dictionary: new () => Dictionary;
