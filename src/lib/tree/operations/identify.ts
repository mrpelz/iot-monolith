import { Element, TElement } from '../main.js';
import { objectKeys } from '../../oop.js';

type Path = (string | number | symbol)[];

let root: TElement | null = null;
const paths = new WeakMap<TElement, Path>();

export const getPathFromElement = (
  source: unknown,
  target: TElement
): Path | null => {
  if (!(source instanceof Element)) return null;

  if (source === target) return [];

  if (source === root && paths.has(target)) {
    return paths.get(target) ?? null;
  }

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

export const calculatePaths = (source: TElement): void => {
  if (root) return;

  root = source;

  for (const element of root.matchChildrenDeep({})) {
    const path = getPathFromElement(root, element);
    if (!path) continue;

    paths.set(element, path);
  }
};
