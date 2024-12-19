import { v5 as uuidv5 } from 'uuid';

import {
  AnyObservable,
  AnyReadOnlyObservable,
  AnyWritableObservable,
} from '../../observable.js';
import { EmptyObject, isPlainObject, objectKeys, Prev } from '../../oop.js';
import { NullState, ReadOnlyNullState } from '../../state.js';
import { isGetter } from '../elements/getter.js';
import { isSetter } from '../elements/setter.js';
import { isTrigger } from '../elements/trigger.js';
import {
  isValueType,
  Level,
  TExclude,
  TValueType,
  ValueType,
} from '../main.js';
import { Paths } from './paths.js';

export enum InteractionType {
  EMIT,
  COLLECT,
}

export type Interaction<T extends ValueType = ValueType> =
  | {
      state: AnyReadOnlyObservable<TValueType[T]>;
      type: InteractionType.EMIT;
      valueType: T;
    }
  | {
      state: AnyWritableObservable<TValueType[T]> | NullState<TValueType[T]>;
      type: InteractionType.COLLECT;
      valueType: T;
    };

export type Values = Record<
  string,
  AnyObservable<unknown> | NullState<unknown>
>;

export const REFERENCE_UUID_NAMESPACE = 'fa18a966-3d78-463a-9a7c-4c8d0d07a948';

export const INTERACTION_UUID_NAMESPACE =
  'cfe7d23c-1bdd-401b-bfb4-f1210694ab83';

export type InteractionReference<
  R extends string = string,
  T extends InteractionType = InteractionType,
> = {
  $: typeof INTERACTION_UUID_NAMESPACE;
  reference: R;
  type: T;
};

export type InteractionUpdate = [string, unknown];

export type ObjectAmendments = { $id: string };

export type TElementSerializationPrimitive = boolean | null | number | string;

export type TElementSerialization =
  | TElementSerializationPrimitive
  | TElementSerializationPrimitive[]
  | InteractionReference
  | ({ [key: string]: TElementSerialization } & ObjectAmendments);

export type ElementSerialization<T, D extends number = 50> = [D] extends [never]
  ? never
  : // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    T extends TExclude | Function
    ? never
    : T extends object
      ? T extends Array<TElementSerializationPrimitive>
        ? T
        : T extends AnyReadOnlyObservable<unknown>
          ? InteractionReference<string, InteractionType.EMIT>
          : T extends AnyWritableObservable<unknown> | NullState<unknown>
            ? InteractionReference<string, InteractionType.COLLECT>
            : {
                [K in keyof T as ElementSerialization<T[K]> extends never
                  ? never
                  : K]: ElementSerialization<T[K], Prev[D]>;
              } & ObjectAmendments
      : T;

const makeInteractionReference = <R extends string, T extends InteractionType>(
  reference: R,
  type: T,
): InteractionReference<R, T> => ({
  $: INTERACTION_UUID_NAMESPACE,
  reference,
  type,
});

export const isInteractionReference = <T extends InteractionType>(
  input: unknown,
  type?: T,
): input is InteractionReference<string, T> => {
  if (typeof input !== 'object') return false;
  if (input === null) return false;

  if (!('$' in input)) return false;
  if (input.$ !== INTERACTION_UUID_NAMESPACE) return false;

  if (!('reference' in input)) return false;
  if (typeof input.reference !== 'string') return false;

  if (!('type' in input)) return false;
  if (typeof input.type !== 'number') return false;
  if (type !== undefined && input.type !== type) return false;

  return true;
};

export const levelDescription = {
  [Level.NONE]: 'NONE',
  [Level.SYSTEM]: 'SYSTEM',
  [Level.HOME]: 'HOME',
  [Level.BUILDING]: 'BUILDING',
  [Level.FLOOR]: 'FLOOR',
  [Level.ROOM]: 'ROOM',
  [Level.AREA]: 'AREA',
  [Level.DEVICE]: 'DEVICE',
  [Level.PROPERTY]: 'PROPERTY',
  [Level.ELEMENT]: 'ELEMENT',
} as const;

export const valueTypeDescription = {
  [ValueType.BOOLEAN]: 'boolean',
  [ValueType.NULL]: 'null',
  [ValueType.NUMBER]: 'number',
  [ValueType.RAW]: 'unknown',
  [ValueType.STRING]: 'string',
} as const;

const invalidValueTypes = ['object', 'function'];

export class Serialization<T extends object> {
  private readonly _interactions = new Map<string, Interaction>();

  private readonly _serializations = new WeakMap<
    object,
    ElementSerialization<object>
  >();

  private readonly _updates = new NullState<InteractionUpdate>();

  readonly tree: ElementSerialization<T>;
  readonly updates: ReadOnlyNullState<InteractionUpdate>;

  constructor(
    root: T,
    private readonly _paths: Paths,
  ) {
    this.updates = new ReadOnlyNullState(this._updates);

    this.tree = this._serializeObject(root);
    Object.freeze(this.tree);
  }

  private _registerCollector<V extends ValueType>(
    id: string,
    state: AnyWritableObservable<unknown> | NullState<unknown>,
    valueType: V,
  ) {
    state.observe((value) => this._updates.trigger([id, value]));

    this._interactions.set(
      id,
      Object.freeze({
        state,
        type: InteractionType.COLLECT,
        valueType,
      }),
    );

    return makeInteractionReference(id, InteractionType.COLLECT);
  }

  private _registerEmitter<V extends ValueType>(
    id: string,
    state: AnyReadOnlyObservable<unknown>,
    valueType: V,
  ) {
    state.observe((value) => this._updates.trigger([id, value]));

    this._interactions.set(
      id,
      Object.freeze({
        state,
        type: InteractionType.EMIT,
        valueType,
      }),
    );

    return makeInteractionReference(id, InteractionType.EMIT);
  }

  private _serializeObject<E extends object>(object: E) {
    const pathRecord = this._paths.getByObject(object);
    if (!pathRecord) return undefined;

    const result = {
      $id: pathRecord.id,
    } as Record<string, TElementSerialization> & ObjectAmendments;

    let props: EmptyObject;

    if (isGetter(object)) {
      const { state, ...rest } = object;
      const { valueType } = rest;
      props = rest;

      result.state = this._registerEmitter(
        uuidv5('state', pathRecord.id),
        state,
        valueType,
      );
    } else if (isSetter(object)) {
      const { state, setState, ...rest } = object;
      const { valueType } = rest;
      props = rest;

      result.state = this._registerEmitter(
        uuidv5('state', pathRecord.id),
        state,
        valueType,
      );

      result.setState = this._registerCollector(
        uuidv5('setState', pathRecord.id),
        setState,
        valueType,
      );
    } else if (isTrigger(object)) {
      const { setState, ...rest } = object;
      const { valueType } = rest;
      props = rest;

      result.setState = this._registerCollector(
        uuidv5('setState', pathRecord.id),
        setState,
        valueType,
      );
    } else {
      props = object;
    }

    for (const key of objectKeys(props)) {
      if (typeof key === 'symbol') continue;
      if (key === '$ref') continue;

      const { [key]: sourceProperty } = props;

      const targetProperty = this._serializeProperty(sourceProperty);
      if (targetProperty === undefined) continue;

      result[key] = targetProperty;
    }

    this._serializations.set(object, result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result as any;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _serializeProperty(property: any): any {
    if (Array.isArray(property)) {
      return property.map((child) => this._serializeProperty(child));
    }

    if (isPlainObject(property)) {
      return this._serializeObject(property);
    }

    if (!invalidValueTypes.includes(typeof property)) {
      return property;
    }

    return undefined;
  }

  get interactions(): IterableIterator<[string, Interaction]> {
    return this._interactions.entries();
  }

  getTreePart<E extends object>(element: E): ElementSerialization<E> {
    return this._serializations.get(element) as ElementSerialization<E>;
  }

  inject([id, value]: InteractionUpdate): void {
    const interaction = this._interactions.get(id);
    if (!interaction) throw new Error('interaction not found');

    const { state, type, valueType } = interaction;

    if (type !== InteractionType.COLLECT) {
      throw new Error('interaction not writable');
    }

    if (!isValueType(value, valueType)) {
      throw new Error('wrong value type given for interaction');
    }

    state.value = value;
  }

  interaction(reference: string): Interaction | undefined {
    return this._interactions.get(reference);
  }
}
