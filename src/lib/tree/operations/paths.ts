import { Element } from '../main.js';
import { objectKeys } from '../../oop.js';

export type Path = (string | number | symbol)[];

export const getPathFromElement = (
  source: unknown,
  target: Element
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
  path: Path
): Element | null => {
  const [key, ...rest] = path;

  const props = source.props;
  if (!(key in props)) return null;

  const property = props[key];
  if (!property || !(property instanceof Element)) return null;

  if (!rest.length) return property;

  return getElementFromPath(property, rest);
};

export class Paths<T extends Element = Element> {
  private readonly _elements = new Map<Path, Element>();
  private readonly _paths = new Map<Element, Path>();

  constructor(root: T) {
    for (const element of root.matchChildrenDeep({})) {
      const path = getPathFromElement(root, element);
      if (!path) continue;

      this._elements.set(path, element);
      this._paths.set(element, path);
    }
  }

  getElement(path: Path): Element | null {
    return this._elements.get(path) ?? null;
  }

  getPath(target: Element): Path | null {
    return this._paths.get(target) ?? null;
  }
}
