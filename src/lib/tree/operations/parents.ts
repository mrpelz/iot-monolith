import { isPlainObject, objectValues } from '@mrpelz/misc-utils';

export class Parents {
  private readonly _parents = new WeakMap<object, Set<object>>();
  constructor(object: object) {
    this._addChildren(object);
  }

  private _addChildren(object: object, parent?: object) {
    if (parent) {
      const parents = this._parents.get(object) ?? new Set<object>();

      parents.add(parent);
      this._parents.set(object, parents);
    }

    for (const child of objectValues(object)) {
      if (!isPlainObject(child) && !Array.isArray(child)) continue;
      this._addChildren(child, object);
    }
  }

  getParents(object: object): Set<object> | undefined {
    return this._parents.get(object);
  }
}
