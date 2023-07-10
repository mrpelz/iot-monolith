import { Element, TElement } from '../main.js';
import { NullState, ReadOnlyNullState } from '../../state.js';
import {
  isObservable,
  isReadOnlyObservable,
  isWritableObservable,
} from '../../observable.js';
import { objectKeys } from '../../oop.js';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InteractionUpdate = [string, any];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CollectorCallback = (value: any) => void;

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

  readonly collector = new NullState<InteractionUpdate>();
  readonly emitter: ReadOnlyNullState<InteractionUpdate>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly serialization: any;

  constructor(root: T) {
    this.emitter = new ReadOnlyNullState(this._emitter);

    this.serialization = this._serializeElement(
      root,
      INTERACTION_UUID_NAMESPACE
    );
    Object.freeze(this.serialization);
  }

  private _serializeElement(element: TElement, parentId: string) {
    const { props } = element;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = {} as any;

    for (const key of objectKeys(props)) {
      if (typeof key === 'symbol') continue;

      const { [key]: sourceProperty } = props;

      const targetProperty = (() => {
        const id = uuidv5(key, parentId);

        if (sourceProperty instanceof Element) {
          return this._serializeElement(sourceProperty, id);
        }

        if (isReadOnlyObservable(sourceProperty)) {
          sourceProperty.observe((value) => this._emitter.trigger([id, value]));

          return makeInteractionReference(id, InteractionType.EMIT);
        }

        if (
          (isObservable(sourceProperty) &&
            isWritableObservable(sourceProperty)) ||
          sourceProperty instanceof NullState
        ) {
          this._collectorCallbacks.set(
            id,
            (value) => (sourceProperty.value = value)
          );

          return makeInteractionReference(id, InteractionType.COLLECT);
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
}
