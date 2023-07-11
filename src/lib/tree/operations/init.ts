import { Element, TElementCallback } from '../main.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const initCallback = (callback: TElementCallback) => ({
  init: true as const,
  initCallback: callback,
});

export const init = <T extends Element>(root: T): void => {
  for (const element of root.matchChildrenDeep({ init: true as const })) {
    element.props.initCallback(element);
  }
};
