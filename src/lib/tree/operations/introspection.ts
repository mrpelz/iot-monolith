import { v5 as uuidv5 } from 'uuid';

import { isPlainObject, objectKeys } from '../../oop.js';

export type ObjectReference = {
  parent?: object;
  path: PropertyKey[];
};

export type ObjectIntrospection = {
  id: string;
  mainReference?: ObjectReference;
  references: Set<ObjectReference>;
};

export const PATH_UUID_NAMESPACE = 'f0f4da2a-7955-43b0-9fe9-02430afad7ef';

export class Introspection {
  static pathString(path: PropertyKey[]): string {
    let result: string[] = [];

    for (const key of path) {
      if (typeof key === 'string') {
        result.push(`${result.length > 0 ? '.' : ''}${key}`);
        continue;
      }

      result.push(
        `[${typeof key === 'symbol' ? key.description : key.toString()}]`,
      );
    }

    return result.join('');
  }

  private readonly _objects = new Map<object, ObjectIntrospection>();

  constructor(object: object) {
    this._handleProperty(object);
  }

  get objects(): unknown {
    return Array.from(this._objects.values()).map(
      ({ id, mainReference, references }) => ({
        id,
        mainReference,
        references,
      }),
    );
  }

  private _handleProperty(input: unknown): void;
  private _handleProperty(
    input: unknown,
    parent: object,
    path: PropertyKey[],
    allowMainReference?: boolean,
  ): void;

  private _handleProperty(
    input: unknown,
    parent?: object,
    path = [] as PropertyKey[],
    allowMainReference = true,
  ) {
    if (!isPlainObject(input)) return;

    const id = uuidv5(Introspection.pathString(path), PATH_UUID_NAMESPACE);

    const reference: ObjectReference = {
      parent,
      path,
    };

    const introspection = this._objects.get(input) ?? {
      id: parent ? id : PATH_UUID_NAMESPACE,
      mainReference: undefined,
      references: new Set(),
    };

    const { mainReference, references } = introspection;
    references.add(reference);

    const thisIsMainReference = allowMainReference && !mainReference;
    if (thisIsMainReference) introspection.mainReference = reference;
    if (parent && thisIsMainReference) introspection.id = id;

    this._objects.set(input, introspection);

    const allowChildrenMainReference =
      allowMainReference &&
      !('$noMainReference' in input && input.$noMainReference === true);

    if (Array.isArray(input)) {
      for (let index = 0; index < input.length; index += 1) {
        const value = input[index];

        this._handleProperty(
          value,
          input,
          [path, index].flat(1),
          allowChildrenMainReference,
        );
      }

      return;
    }

    for (const key of objectKeys(input)) {
      const value = input[key];

      this._handleProperty(
        value,
        input,
        [path, key].flat(1),
        allowChildrenMainReference,
      );
    }
  }

  getObject(object: object): ObjectIntrospection | undefined {
    return this._objects.get(object);
  }
}
