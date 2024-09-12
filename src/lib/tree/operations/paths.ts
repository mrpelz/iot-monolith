import { v5 as uuidv5 } from 'uuid';

import { arrayCompare } from '../../data.js';
import { objectKeys } from '../../oop.js';
import { Element } from '../main.js';

export type Path = (string | number | symbol)[];

export type PathRecord = {
  element: Element;
  id: string;
  path: Path;
};

export const PATH_UUID_NAMESPACE = 'f0f4da2a-7955-43b0-9fe9-02430afad7ef';

export const getPathFromElement = (
  source: unknown,
  target: Element,
): Path | null => {
  if (!(source instanceof Element)) return null;

  if (source === target) return [];

  for (const key of objectKeys(source.props)) {
    const prop = source.props[key];

    const match = getPathFromElement(prop, target);
    if (!match) continue;

    return [key, match].flat(1);
  }

  return null;
};

export const getElementFromPath = (
  source: Element,
  path: Path,
): Element | null => {
  const [key, ...rest] = path;

  const props = source.props;
  if (!(key in props)) return null;

  const property = props[key];
  if (!property || !(property instanceof Element)) return null;

  if (rest.length === 0) return property;

  return getElementFromPath(property, rest);
};

export class Paths {
  private readonly _paths = new Set<PathRecord>();

  constructor(root: Element) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    for (const element of root.matchChildrenDeep({})) {
      const path = getPathFromElement(root, element);
      if (!path) continue;

      this._paths.add({
        element,
        id:
          element === root
            ? PATH_UUID_NAMESPACE
            : uuidv5(path.join('.'), PATH_UUID_NAMESPACE),
        path,
      });
    }
  }

  getByElement(target: Element): PathRecord | null {
    for (const pathRecord of this._paths.values()) {
      if (target !== pathRecord.element) continue;

      return pathRecord;
    }

    return null;
  }

  getById(id: string): PathRecord | null {
    for (const pathRecord of this._paths.values()) {
      if (id !== pathRecord.id) continue;

      return pathRecord;
    }

    return null;
  }

  getByPath(path: Path): PathRecord | null {
    for (const pathRecord of this._paths.values()) {
      if (!arrayCompare(path, pathRecord.path)) continue;

      return pathRecord;
    }

    return null;
  }
}
