import { Element, TElement } from '../main.js';
import { objectKeys } from '../../oop.js';

export type Path = (string | number | symbol)[];

export const getPathFromElement = (
  source: unknown,
  target: TElement
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
  source: TElement,
  path: Path
): TElement | null => {
  const [key, ...rest] = path;

  const props = source.props;
  if (!(key in props)) return null;

  const property = props[key];
  if (!property || !(property instanceof Element)) return null;

  if (!rest.length) return property;

  return getElementFromPath(property, rest);
};

export class Paths<T extends TElement> {
  private readonly _elements = new Map<Path, TElement>();
  private readonly _paths = new Map<TElement, Path>();

  constructor(root: T) {
    for (const element of root.matchChildrenDeep({})) {
      const path = getPathFromElement(root, element);
      if (!path) continue;

      this._elements.set(path, element);
      this._paths.set(element, path);
    }
  }

  getElement(path: Path): TElement | null {
    return this._elements.get(path) ?? null;
  }

  getPath(target: TElement): Path | null {
    return this._paths.get(target) ?? null;
  }
}
