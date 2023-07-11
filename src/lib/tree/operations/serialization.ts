import {
  AnyReadOnlyObservable,
  AnyWritableObservable,
} from '../../observable.js';
import { Element, TElement, ValueType, isValueType } from '../main.js';
import { EmptyObject, objectKeys } from '../../oop.js';
import { Getter, $ as getterMark } from '../elements/getter.js';
import { NullState, ReadOnlyNullState } from '../../state.js';
import { Setter, $ as setterMark } from '../elements/setter.js';
import { Trigger, $ as triggerMark } from '../elements/trigger.js';
import { v5 as uuidv5 } from 'uuid';

export enum InteractionType {
  EMIT,
  COLLECT,
}

const INTERACTION_UUID_NAMESPACE = 'cfe7d23c-1bdd-401b-bfb4-f1210694ab83';

const makeInteractionReference = <R extends string, T extends InteractionType>(
  reference: R,
  type: T
) => ({
  $: INTERACTION_UUID_NAMESPACE,
  reference,
  type,
});

export type InteractionReference = ReturnType<typeof makeInteractionReference>;

export type InteractionUpdate = [string, unknown];

export type CollectorCallback = (value: unknown) => void;

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

export class Serialization<T extends TElement> {
  private readonly _collectorCallbacks = new Map<string, CollectorCallback>();
  private readonly _emitter = new NullState<InteractionUpdate>();

  readonly emitter: ReadOnlyNullState<InteractionUpdate>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly tree: any;

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
      if (!isValueType(value, valueType)) return;

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

  private _serializeElement(element: TElement, parentId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = {} as any;

    let props: EmptyObject;

    if (element.match({ $: getterMark })) {
      const { state, ...rest } = (element as Getter).props;
      props = rest;

      result.state = this._registerEmitter(uuidv5('state', parentId), state);
    } else if (element.match({ $: setterMark })) {
      const { state, setState, ...rest } = (element as Setter).props;
      const { valueType } = rest;
      props = rest;

      result.state = this._registerEmitter(uuidv5('state', parentId), state);

      result.setState = this._registerCollector(
        uuidv5('setState', parentId),
        setState,
        valueType
      );
    } else if (element.match({ $: triggerMark })) {
      const { state, ...rest } = (element as Trigger).props;
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
        const id = uuidv5(key, parentId);

        if (sourceProperty instanceof Element) {
          return this._serializeElement(sourceProperty, id);
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
