/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { AnyObservable, Observable, ReadOnlyObservable } from './observable.js';
import { RollingNumber } from './rolling-number.js';

type MetaKeys = 'actuator' | 'name' | 'metric' | 'type' | 'unit';
export type Meta = Partial<Record<MetaKeys, string>>;

export type Stream = ReadOnlyObservable<[number, unknown] | null>;
export type Values = [number, unknown][];

export const metadataStore = new WeakMap<object, Meta>();

export class Tree {
  private _getterIndex = new RollingNumber(0, Infinity);
  private readonly _getters = new Map<ReadOnlyObservable<unknown>, number>();
  private _setterIndex = new RollingNumber(0, Infinity);
  private readonly _setters = new Map<number, any>();
  private _stream: Stream | null = null;

  readonly structure: any;

  constructor(input: any) {
    this.structure = this._serialize(input);
  }

  get stream(): Stream {
    if (this._stream) return this._stream;

    const observable = new Observable<[number, unknown] | null>(null);

    for (const [getter, key] of this._getters) {
      (getter as unknown as AnyObservable<unknown>).observe(
        (value) => (observable.value = [key, value])
      );
    }

    this._stream = new ReadOnlyObservable(observable);

    return this._stream;
  }

  private _getGetterIndex(value: ReadOnlyObservable<unknown>) {
    const entry = this._getters.get(value);
    if (entry !== undefined) return entry;

    const entryIndex = this._getterIndex.get();
    this._getters.set(value, entryIndex);

    return entryIndex;
  }

  private _getSetterIndex(value: unknown) {
    const entry = [...this._setters.values()].find(
      (setter) => setter === value
    );
    if (entry !== undefined) return entry;

    const entryIndex = this._setterIndex.get();
    this._setters.set(entryIndex, value);

    return entryIndex;
  }

  private _serialize(object: any, parentMeta?: Meta) {
    if (typeof object !== 'object') return undefined;

    const meta = (() => {
      return {
        ...parentMeta,
        name: undefined,
        ...(metadataStore.get(object) || undefined),
      };
    })();

    const nodes = ((): any => {
      const result = Object.entries(object)
        .filter(([key]) => !['$', '_get', '_set'].includes(key))
        .map(([key, node]) => [key, this._serialize(node, meta)]);

      return result.length ? Object.fromEntries(result) : undefined;
    })();

    const get = (() => {
      if (!('_get' in object)) return undefined;
      if (!(object._get instanceof ReadOnlyObservable)) return undefined;

      return this._getGetterIndex(object._get);
    })();

    const set = (() => {
      if (!('_set' in object)) return undefined;
      return this._getSetterIndex(object._set);
    })();

    return {
      get,
      meta,
      nodes,
      set,
    };
  }

  set(index: number, value: unknown): void {
    const setter = this._setters.get(index);
    if (!setter) return;

    setter.value = value;
  }

  values(): Values {
    return Array.from(this._getters.entries()).map(([state, index]) => [
      index,
      state.value,
    ]);
  }
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
