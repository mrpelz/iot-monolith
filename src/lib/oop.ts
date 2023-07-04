/* eslint-disable @typescript-eslint/no-explicit-any */

export type Constructor<T> = { new (...args: any[]): T };

export type EmptyObject = Record<string | symbol, any>;
export type ObjectValues<T extends EmptyObject> = T[keyof T];

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never;

type Prev = [
  never,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  ...0[]
];

export type DeepPaths<
  T,
  N extends object,
  P extends keyof N,
  D extends number = 20
> = [D] extends [never]
  ? never
  : T extends N
  ? {
      [K in keyof T[P]]-?: K extends string | number
        ? `${K}` | Join<K, DeepPaths<T[P][K], N, P, Prev[D]>>
        : never;
    }[keyof T[P]]
  : '';

export type DeepValues<
  T,
  N extends object,
  P extends keyof N,
  D extends number = 20
> = [D] extends [never]
  ? never
  : T extends N
  ? {
      [K in keyof T[P]]-?:
        | (T[P][K] extends N ? T[P][K] : never)
        | DeepValues<T[P][K], N, P, Prev[D]>;
    }[keyof T[P]]
  : never;

export const classMethods = (
  classDefinition: Constructor<Record<string, unknown>>
): string[] =>
  Object.keys(
    Object.getOwnPropertyDescriptors(classDefinition.prototype)
  ).filter((name) => name !== 'constructor' && name[0] !== '_');

export const instanceMethods = (instance: Record<string, unknown>): string[] =>
  Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(
    (name) => name !== 'constructor' && name[0] !== '_'
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rebind = (context: any, ...names: string[]): void => {
  for (const name of names) {
    const fn = context[name];
    if (typeof fn !== 'function') return;

    context[name] = fn.bind(context);
  }
};

export const objectKeys = <T extends EmptyObject>(input: T): (keyof T)[] => [
  ...Object.getOwnPropertySymbols(input),
  ...Object.getOwnPropertyNames(input),
];

export const objectValues = <T extends EmptyObject>(
  input: T
): ObjectValues<T>[] => objectKeys(input).map((property) => input[property]);
