import { anyFunction, match } from '../main.js';
import { Introspection } from './introspection.js';

export type InitFunction = (
  object: object,
  introspection: Introspection,
) => void;

export const init = <T extends object>(
  root: T,
  introspection: Introspection,
): void => {
  for (const object of new Set(
    match({ $init: anyFunction }, undefined, root, 50),
  )) {
    const fn = object.$init as InitFunction;
    fn(object, introspection);
  }
};
