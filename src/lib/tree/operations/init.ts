import { anyFunction, match } from '../main.js';

export type InitFunction = (object: object) => void;

export const init = <T extends object>(root: T): void => {
  for (const object of new Set(match({ $init: anyFunction }, root, 50))) {
    const fn = object.$init as InitFunction;
    fn(object);
  }
};
