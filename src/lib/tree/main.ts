/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  AnyObservable,
  AnyReadOnlyObservable,
  AnyWritableObservable,
  Observable,
  ReadOnlyObservable,
  isWritableObservable,
} from '../observable.js';
import { RollingNumber } from '../rolling-number.js';

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

export const valueTypeMap = {
  [ValueType.BOOLEAN]: {
    typeof: 'boolean',
  },
  [ValueType.NULL]: {
    typeof: 'object',
    value: null,
  },
  [ValueType.NUMBER]: {
    typeof: 'number',
  },
  [ValueType.RAW]: {
    abort: true,
  },
  [ValueType.STRING]: {
    typeof: 'string',
  },
};

export function isValidValue(value: unknown, valueType: ValueType): boolean {
  const valueTypeMapItem = valueTypeMap[valueType];
  if (!valueTypeMapItem) return false;

  if ('abort' in valueTypeMapItem && valueTypeMapItem.abort) {
    return false;
  }

  if ('value' in valueTypeMapItem && valueTypeMapItem.value !== value) {
    return false;
  }

  if (
    'typeof' in valueTypeMapItem &&
    valueTypeMapItem.typeof !== typeof value
  ) {
    return false;
  }

  return true;
}

export class Tree {
  private _getterIndex = new RollingNumber(0, Infinity);
  private readonly _getters = new Map<AnyReadOnlyObservable<unknown>, number>();
  private _setterIndex = new RollingNumber(0, Infinity);
  private readonly _setters = new Map<
    number,
    [AnyWritableObservable<unknown>, ValueType]
  >();

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

  private _getGetterIndex(value: AnyReadOnlyObservable<unknown>) {
    const entry = this._getters.get(value);
    if (entry !== undefined) return entry;

    const entryIndex = this._getterIndex.get();
    this._getters.set(value, entryIndex);

    return entryIndex;
  }

  private _getSetterIndex(
    value: AnyWritableObservable<unknown>,
    valueType: ValueType
  ) {
    const entry = [...this._setters.entries()].find(
      ([, [setter]]) => setter === value
    )?.[0];
    if (entry !== undefined) return entry;

    const entryIndex = this._setterIndex.get();
    this._setters.set(entryIndex, [value, valueType]);

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
      if (isWritableObservable(object._get)) {
        return undefined;
      }

      return this._getGetterIndex(object._get);
    })();

    const set = (() => {
      if (!('_set' in object)) return undefined;
      if (!meta) return undefined;
      if (meta.level !== Levels.PROPERTY) return undefined;
      if (meta.valueType === undefined) return undefined;

      return this._getSetterIndex(object._set, meta.valueType);
    })();

    return {
      children,
      get,
      meta,
      set,
    };
  }

  set(index: number, value: unknown): void {
    const item = this._setters.get(index);
    if (!item) return;

    const [setter, valueType] = item;
    if (!isValidValue(value, valueType)) return;

    setter.value = value;
  }

  value(index: number): unknown {
    const result = Array.from(this._getters.entries()).find(
      ([, gettersIndex]) => gettersIndex === index
    );

    if (!result) return undefined;

    const [getter] = result;

    return getter.value;
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
  ): asserts this is Dictionary<{
    [P in K | keyof O]: P extends K ? V : P extends keyof O ? O[P] : V;
  }>;
  set<K extends keyof O>(key: K, value: O[K]): void;
}
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const Dictionary: new () => Dictionary;
