/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { AnyObservable, Observable, ReadOnlyObservable } from './observable.js';
import { RollingNumber } from './rolling-number.js';

export const inherit = Symbol('inherit');

type Inherit = typeof inherit;

export enum Levels {
  SYSTEM,
  HOME,
  BUILDING,
  FLOOR,
  ROOM,
  AREA,
  DEVICE,
  PROPERTY,
}

export enum ValueType {
  NULL,
  BOOLEAN,
  NUMBER,
  STRING,
  RAW,
}

export enum ParentRelation {
  META_RELATION,
  CONTROL_TRIGGER,
  CONTROL_EXTENSION,
  DATA_QUALIFIER,
  DATA_AGGREGATION_SOURCE,
}

export type MetaSystem = {
  level: Levels.SYSTEM;
};

export type MetaHome = {
  isPrimary?: true;
  level: Levels.HOME;
  name?: string;
};

export type MetaBuilding = {
  isPrimary?: true;
  level: Levels.BUILDING;
  name?: string;
};

export type MetaFloor = {
  isBasement?: true;
  isGroundFloor?: true;
  isPartiallyOutside?: true;
  isPrimary?: true;
  level: Levels.FLOOR;
  name?: string;
};

export type MetaRoom = {
  isConnectingRoom?: true;
  isDaylit?: true;
  level: Levels.ROOM;
  name?: string;
};

export type MetaArea = {
  level: Levels.AREA;
  name?: string;
};

export type MetaDevice = {
  isSubDevice?: true;
  level: Levels.DEVICE;
  name?: string;
};

type MetaProperty = {
  level: Levels.PROPERTY;
  name?: string | Inherit;
  parentRelation?: ParentRelation;
};

export type MetaPropertySensor = MetaProperty & {
  measured?: string | Inherit;
  type: 'sensor';
  unit?: string;
  valueType: ValueType;
};

export type MetaPropertyActuator = MetaProperty & {
  actuated?: string | Inherit;
  type: 'actuator';
  valueType: ValueType;
};

export type Meta =
  | MetaSystem
  | MetaHome
  | MetaBuilding
  | MetaFloor
  | MetaRoom
  | MetaArea
  | MetaDevice
  | MetaPropertySensor
  | MetaPropertyActuator;

interface MetadataExtensionStore {
  delete(key: object): boolean;
  get<T extends Meta, K extends object>(
    key: K
  ): { [P in keyof K]?: Partial<T> } | undefined;
  has(key: object): boolean;
  set<T extends Meta, K extends object>(
    key: K,
    value: { [P in keyof K]?: Partial<T> }
  ): this;
}

export type Stream = ReadOnlyObservable<[number, unknown] | null>;
export type Values = [number, unknown][];

export const metadataStore = new WeakMap<object, Meta>();
export const metadataExtensionStore = new WeakMap() as MetadataExtensionStore;

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

  private _serialize<T extends Meta>(
    object: any,
    property?: string,
    parentMeta?: T,
    metaExtension?: Partial<Meta>
  ) {
    if (typeof object !== 'object') return undefined;

    const extension = metadataExtensionStore.get(object) || undefined;

    const meta = (() => {
      const result = metadataStore.get(object) || undefined;
      if (!result) return undefined;

      for (const [key, value] of Object.entries(result)) {
        if (value === inherit) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          result[key] = parentMeta[key];
        }
      }

      return {
        ...(result.level === Levels.SYSTEM || !property
          ? undefined
          : {
              name: property,
            }),
        ...result,
        ...metaExtension,
      };
    })();

    const children = ((): any => {
      const result = Object.entries(object)
        .filter(([key]) => !['$', '_get', '_set'].includes(key))
        .map(([key, node]) => [
          key,
          this._serialize(node, key, meta as T, extension?.[key]),
        ]);

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
      children,
      get,
      meta,
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
