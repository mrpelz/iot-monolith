import { ReadOnlyObservable } from './observable.js';
import { app } from '../app/app.js';

type MetaKeys = 'actuator' | 'name' | 'metric' | 'type' | 'unit';

export type Meta = Partial<Record<MetaKeys, string>>;

// eslint-disable-next-line @typescript-eslint/ban-types
export const metadataStore = new WeakMap<object, Meta>();

export type Tree = ReturnType<typeof app>;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function hierarchyToObject(input: Tree) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const states = new Map<any, number>();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialize = (object: any) => {
    if (typeof object !== 'object') return undefined;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const nodes = (() => {
      return Object.fromEntries(
        Object.entries(object)
          .filter(([key]) => !['$', '_get', '_set'].includes(key))
          .map(([key, node]) => [key, serialize(node)])
      );
    })();

    const _meta = (() => {
      return metadataStore.get(object) || undefined;
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
    structure: () => serialize(input),
    values,
  };
}

// eslint-disable-next-line @typescript-eslint/ban-types
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
