import { v5 as uuidv5 } from 'uuid';

import {
  AnyObservable,
  AnyReadOnlyObservable,
  AnyWritableObservable,
} from '../../observable.js';
import { EmptyObject, objectKeys, Prev } from '../../oop.js';
import { NullState, ReadOnlyNullState } from '../../state.js';
import { isGetter } from '../elements/getter.js';
import { isSetter } from '../elements/setter.js';
import { isTrigger } from '../elements/trigger.js';
import {
  Element,
  isValueType,
  TElementProps,
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

const INTERACTION_UUID_NAMESPACE = 'cfe7d23c-1bdd-401b-bfb4-f1210694ab83';

export type InteractionReference<
  R extends string = string,
  T extends InteractionType = InteractionType,
> = {
  $: typeof INTERACTION_UUID_NAMESPACE;
  reference: R;
  type: T;
};

export type InteractionUpdate = [string, unknown];

export type TElementSerialization =
  | boolean
  | null
  | number
  | string
  | InteractionReference
  | { [key: string]: TElementSerialization };

export type ElementSerialization<T, D extends number = 20> = [D] extends [never]
  ? never
  : T extends Element
    ? {
        [K in keyof TElementProps<T> as ElementSerialization<
          TElementProps<T>[K],
          Prev[D]
        > extends never
          ? never
          : K]: ElementSerialization<TElementProps<T>[K], Prev[D]>;
      }
    : T extends object
      ? T extends AnyReadOnlyObservable<unknown>
        ? InteractionReference<string, InteractionType.EMIT>
        : T extends AnyWritableObservable<unknown> | NullState<unknown>
          ? InteractionReference<string, InteractionType.COLLECT>
          : never
      : T;

const makeInteractionReference = <R extends string, T extends InteractionType>(
  reference: R,
  type: T,
): InteractionReference<R, T> => ({
  $: INTERACTION_UUID_NAMESPACE,
  reference,
  type,
});

export const isInteractionReference = (
  input: unknown,
): input is InteractionReference => {
  if (typeof input !== 'object') return false;
  if (input === null) return false;

  if (!('$' in input)) return false;
  if (input.$ !== INTERACTION_UUID_NAMESPACE) return false;

  if (!('reference' in input)) return false;
  if (typeof input.reference !== 'string') return false;

  if (!('type' in input)) return false;
  if (typeof input.type !== 'number') return false;

  return true;
};

export class Serialization<T extends Element> {
  private readonly _interactions = new Map<string, Interaction>();

  private readonly _serializations = new WeakMap<
    Element,
    ElementSerialization<Element>
  >();

  private readonly _updates = new NullState<InteractionUpdate>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly tree: ElementSerialization<T>;

  readonly updates: ReadOnlyNullState<InteractionUpdate>;

  constructor(
    root: T,
    private readonly _paths: Paths,
  ) {
    this.updates = new ReadOnlyNullState(this._updates);

    this.tree = this._serializeElement(root);
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

  private _serializeElement<E extends Element>(element: E) {
    const { id } = this._paths.getByElement(element) ?? {};
    if (!id) return null;

    const result = {} as Record<string, TElementSerialization>;

    let props: EmptyObject;

    if (isGetter(element)) {
      const { state, ...rest } = element.props;
      const { valueType } = rest;
      props = rest;

      result.state = this._registerEmitter(
        uuidv5('state', id),
        state,
        valueType,
      );
    } else if (isSetter(element)) {
      const { state, setState, ...rest } = element.props;
      const { valueType } = rest;
      props = rest;

      result.state = this._registerEmitter(
        uuidv5('state', id),
        state,
        valueType,
      );

      result.setState = this._registerCollector(
        uuidv5('setState', id),
        setState,
        valueType,
      );
    } else if (isTrigger(element)) {
      const { setState, ...rest } = element.props;
      const { valueType } = rest;
      props = rest;

      result.setState = this._registerCollector(
        uuidv5('setState', id),
        setState,
        valueType,
      );
    } else {
      props = element.props;
    }

    for (const key of objectKeys(props)) {
      if (typeof key === 'symbol') continue;

      const { [key]: sourceProperty } = props;

      const targetProperty = (() => {
        if (sourceProperty instanceof Element) {
          return this._serializeElement(sourceProperty);
        }

        if (['object', 'function'].includes(typeof sourceProperty)) {
          return undefined;
        }

        return sourceProperty;
      })();

      if (targetProperty === undefined) continue;

      result[key] = targetProperty;
    }

    this._serializations.set(element, result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result as any;
  }

  get interactions(): IterableIterator<[string, Interaction]> {
    return this._interactions.entries();
  }

  getTreePart<E extends Element>(element: E): ElementSerialization<E> {
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