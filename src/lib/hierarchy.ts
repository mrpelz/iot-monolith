import { ReadOnlyObservable } from './observable.js';

type MetaKeys = 'name' | 'metric' | 'type' | 'unit';

export type Meta = Partial<Record<MetaKeys, string>>;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
export function hierarchyToObject(input: any) {
  if (typeof input !== 'object') return undefined;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const nodes = (() => {
    if (!('nodes' in input)) return undefined;
    if (typeof input.nodes !== 'object') return undefined;
    return Object.fromEntries(
      Object.entries(input.nodes).map(([key, node]) => [
        key,
        hierarchyToObject(node),
      ])
    );
  })();

  const meta = (() => {
    if (!('meta' in input)) return undefined;
    if (typeof input.meta !== 'object') return undefined;
    return input.meta;
  })();

  const state = (() => {
    if (!('state' in input)) return undefined;
    if (!(input.state instanceof ReadOnlyObservable)) return undefined;
    return input.state.value;
  })();

  return {
    meta,
    nodes,
    settable: 'setter' in input || undefined,
    state,
  };
}
