import {
  AnyReadOnlyObservable,
  AnyWritableObservable,
} from '../../observable.js';
import { Element, TElementProps, ValueType, isValueType } from '../main.js';
import { EmptyObject, Prev, objectKeys } from '../../oop.js';
import { NullState, ReadOnlyNullState } from '../../state.js';
import { isGetter } from '../elements/getter.js';
import { isSetter } from '../elements/setter.js';
import { isTrigger } from '../elements/trigger.js';
import { v5 as uuidv5 } from 'uuid';

export enum InteractionType {
  EMIT,
  COLLECT,
}

const INTERACTION_UUID_NAMESPACE =
  'cfe7d23c-1bdd-401b-bfb4-f1210694ab83' as const;

export type InteractionReference<
  R extends string,
  T extends InteractionType
> = {
  $: typeof INTERACTION_UUID_NAMESPACE;
  reference: R;
  type: T;
};

const makeInteractionReference = <R extends string, T extends InteractionType>(
  reference: R,
  type: T
): InteractionReference<R, T> => ({
  $: INTERACTION_UUID_NAMESPACE,
  reference,
  type,
});

export type InteractionUpdate = [string, unknown];

export type CollectorCallback = (value: unknown) => void;

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

// const isInteractionReference = (
//   input: unknown
// ): input is InteractionReference => {
//   if (typeof input !== 'object') return false;
//   if (input === null) return false;

//   if (!('$' in input)) return false;
//   if (input.$ !== INTERACTION_REFERENCE_MARKER) return false;

//   if (!('reference' in input)) return false;
//   if (typeof input.reference !== 'string') return false;

//   if (!('type' in input)) return false;
//   if (typeof input.type !== 'number') return false;

//   return true;
// };

export class Serialization<T extends Element> {
  private readonly _collectorCallbacks = new Map<string, CollectorCallback>();
  private readonly _emitter = new NullState<InteractionUpdate>();

  readonly emitter: ReadOnlyNullState<InteractionUpdate>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly tree: ElementSerialization<T>;

  constructor(root: T) {
    this.emitter = new ReadOnlyNullState(this._emitter);

    this.tree = this._serializeElement(root, INTERACTION_UUID_NAMESPACE);
    Object.freeze(this.tree);
  }

  private _registerCollector(
    id: string,
    collector: AnyWritableObservable<unknown> | NullState<unknown>,
    valueType: ValueType
  ) {
    collector.observe((value) => this._emitter.trigger([id, value]));

    this._collectorCallbacks.set(id, (value) => {
      if (!isValueType(value, valueType)) {
        throw new Error(
          `error collecting value "${value}": type does not match collector`
        );
      }

      collector.value = value;
    });

    return makeInteractionReference(id, InteractionType.COLLECT);
  }

  private _registerEmitter(
    id: string,
    emitter: AnyReadOnlyObservable<unknown>
  ) {
    emitter.observe((value) => this._emitter.trigger([id, value]));

    return makeInteractionReference(id, InteractionType.EMIT);
  }

  private _serializeElement<E extends Element>(element: E, parentId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = {} as any;

    let props: EmptyObject;

    if (isGetter(element)) {
      const { state, ...rest } = element.props;
      props = rest;

      result.state = this._registerEmitter(uuidv5('state', parentId), state);
    } else if (isSetter(element)) {
      const { state, setState, ...rest } = element.props;
      const { valueType } = rest;
      props = rest;

      result.state = this._registerEmitter(uuidv5('state', parentId), state);

      result.setState = this._registerCollector(
        uuidv5('setState', parentId),
        setState,
        valueType
      );
    } else if (isTrigger(element)) {
      const { state, ...rest } = element.props;
      const { valueType } = rest;
      props = rest;

      result.state = this._registerCollector(
        uuidv5('state', parentId),
        state,
        valueType
      );
    } else {
      props = element.props;
    }

    for (const key of objectKeys(props)) {
      if (typeof key === 'symbol') continue;

      const { [key]: sourceProperty } = props;

      const targetProperty = (() => {
        if (sourceProperty instanceof Element) {
          return this._serializeElement(sourceProperty, uuidv5(key, parentId));
        }

        if (['object', 'function'].includes(typeof sourceProperty)) {
          return undefined;
        }

        return sourceProperty;
      })();

      if (targetProperty === undefined) continue;

      result[key] = targetProperty;
    }

    return result;
  }

  inject([id, value]: InteractionUpdate): void {
    this._collectorCallbacks.get(id)?.(value);
  }
}
