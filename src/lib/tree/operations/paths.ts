import { arrayCompare } from '@mrpelz/misc-utils/data';
import { isPlainObject, objectKeys } from '@mrpelz/misc-utils/oop';
import { v5 as uuidv5 } from 'uuid';

import { match } from '../main.js';

export type Path = (string | number | symbol)[];

export type PathRecord = {
  id: string;
  object: object;
  path: Path;
};

export const PATH_UUID_NAMESPACE = 'f0f4da2a-7955-43b0-9fe9-02430afad7ef';

export const getPathFromObject = (
  source: unknown,
  object: object,
): Path | undefined => {
  if (!isPlainObject(source)) return undefined;

  if (source === object) return [];

  for (const key of objectKeys(source)) {
    const prop = source[key];

    const propMatch = getPathFromObject(prop, object);
    if (!propMatch) continue;

    return [key, propMatch].flat();
  }

  return undefined;
};

export const getObjectFromPath = <S extends object>(
  source: S,
  path: Path,
): object | undefined => {
  const [key, ...rest] = path;
  if (!key) return undefined;

  if (!(key in source)) return undefined;

  const property = source[key as keyof S];
  if (!property || !isPlainObject(property)) return undefined;

  if (rest.length === 0) return property;

  return getObjectFromPath(property, rest);
};

export class Paths {
  private readonly _paths = new Set<PathRecord>();

  constructor(root: object) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    for (const object of match({}, root)) {
      const path = getPathFromObject(root, object);
      if (!path) continue;

      this._paths.add({
        id:
          object === root
            ? PATH_UUID_NAMESPACE
            : uuidv5(path.join('.'), PATH_UUID_NAMESPACE),
        object,
        path,
      });
    }
  }

  getById(id: string): PathRecord | undefined {
    for (const pathRecord of this._paths.values()) {
      if (id !== pathRecord.id) continue;

      return pathRecord;
    }

    return undefined;
  }

  getByObject(object: object): PathRecord | undefined {
    for (const pathRecord of this._paths.values()) {
      if (object !== pathRecord.object) continue;

      return pathRecord;
    }

    return undefined;
  }

  getByPath(path: Path): PathRecord | undefined {
    for (const pathRecord of this._paths.values()) {
      if (!arrayCompare(path, pathRecord.path)) continue;

      return pathRecord;
    }

    return undefined;
  }

  getParent(object: object): PathRecord | undefined {
    const path = this.getByObject(object);
    if (!path) return undefined;

    return this.getByPath(path.path.slice(0, -1));
  }
}
