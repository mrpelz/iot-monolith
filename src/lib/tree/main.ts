/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  AnyReadOnlyObservable,
  AnyWritableObservable,
  Observable,
  ReadOnlyObservable,
  isWritableObservable,
} from '../observable.js';
import { RollingNumber } from '../rolling-number.js';
import { createHash } from 'node:crypto';

const ROOT_IDENTIFIER = '$';

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
  id: string;
  level: Levels.SYSTEM;
};

export type MetaHome = {
  isPrimary?: true;
  level: Levels.HOME;
  name: string;
};

export type MetaBuilding = {
  isPrimary?: true;
  level: Levels.BUILDING;
  name: string;
};

export type MetaFloor = {
  isBasement?: true;
  isGroundFloor?: true;
  isPartiallyOutside?: true;
  isPrimary?: true;
  level: Levels.FLOOR;
  name: string;
};

export type MetaRoom = {
  isConnectingRoom?: true;
  isDaylit?: true;
  level: Levels.ROOM;
  name: string;
};

export type MetaArea = {
  level: Levels.AREA;
  name: string;
};

export type MetaDevice = {
  host?: string;
  identifier?: number[];
  isSubDevice?: true;
  level: Levels.DEVICE;
  name: string;
  port?: number;
  transportType?: string;
  type?: string;
};

type MetaProperty = {
  level: Levels.PROPERTY;
  name: string | Inherit;
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
  ): Partial<Record<keyof K, Partial<T>>> | undefined;
  has(key: object): boolean;
  set<T extends Meta, K extends object>(
    key: K,
    value: Partial<Record<keyof K, Partial<T>>>
  ): this;
}

export type Stream = ReadOnlyObservable<[number, unknown] | null>;
export type Values = [number, unknown][];

const metadataStore = new WeakMap<object, Partial<Meta>>();
const metadataExtensionStore = new WeakMap() as MetadataExtensionStore;

export const addMeta = <T extends object, S extends Partial<Meta>>(
  object: T,
  meta: S
): T => {
  metadataStore.set(object, meta);
  return object;
};

export const addMetaExtension = <S extends Meta, T extends object>(
  object: T,
  meta: Partial<Record<keyof T, Partial<S>>>
): T => {
  metadataExtensionStore.set(object, meta);
  return object;
};

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

export const isValidValue = (value: unknown, valueType: ValueType): boolean => {
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
};

export class Tree {
  private _getterIndex = new RollingNumber(0, Infinity);
  private readonly _getters = new Map<AnyReadOnlyObservable<unknown>, number>();
  private _setterIndex = new RollingNumber(0, Infinity);
  private readonly _setters = new Map<
    number,
    [AnyWritableObservable<unknown>, ValueType]
  >();

  readonly stream: Stream;
  readonly structure: any;

  constructor(input: any) {
    this.structure = this._serialize(input, [], ROOT_IDENTIFIER);
    this.stream = this._stream();
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
    previousPath: string[],
    property: string,
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

      if (
        result.level !== Levels.SYSTEM &&
        (!('name' in result) || !result.name) &&
        property
      ) {
        (result as Partial<Exclude<Meta, MetaSystem>>).name = property;
      }

      return {
        ...result,
        ...metaExtension,
      } as Meta;
    })();

    const thisPath = [...previousPath, property];

    const children = ((): any => {
      const result = Object.entries(object)
        .filter(([key]) => !['$', '_get', '_set'].includes(key))
        .map(([key, node]) => [
          key,
          this._serialize(node, thisPath, key, meta as T, extension?.[key]),
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

    const id =
      property === ROOT_IDENTIFIER
        ? ROOT_IDENTIFIER
        : createHash('sha256').update(thisPath.join('\0')).digest('hex');

    return {
      children,
      get,
      id,
      meta,
      property,
      set,
    };
  }

  private _stream(): Stream {
    const observable = new Observable<[number, unknown] | null>(null);

    for (const [getter, key] of this._getters) {
      (getter as unknown as AnyReadOnlyObservable<unknown>).observe(
        (value) => (observable.value = [key, value])
      );
    }

    return new ReadOnlyObservable(observable);
  }

  getter(index: number): AnyReadOnlyObservable<unknown> | undefined {
    const result = Array.from(this._getters.entries()).find(
      ([, gettersIndex]) => gettersIndex === index
    );

    if (!result) return undefined;

    const [getter] = result;

    return getter;
  }

  set(index: number, value: unknown): void {
    const item = this._setters.get(index);
    if (!item) return;

    const [setter, valueType] = item;
    if (!isValidValue(value, valueType)) return;

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
  ): asserts this is Dictionary<{
    [P in K | keyof O]: P extends K ? V : P extends keyof O ? O[P] : V;
  }>;
  set<K extends keyof O>(key: K, value: O[K]): void;
}
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const Dictionary: new () => Dictionary;
