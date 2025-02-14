import { isPlainObject, objectValues } from '../../oop.js';

export class Parents {
  private readonly _parents = new Map<object, object | undefined>();
  constructor(object: object) {
    this._addChildren(object, undefined);
  }

  private _addChildren(object: object, parent?: object) {
    this._parents.set(object, parent);

    for (const child of objectValues(object)) {
      if (!isPlainObject(child)) continue;
      this._addChildren(child, object);
    }
  }

  getParent(object: object): object | undefined {
    return this._parents.get(object);
  }
}
