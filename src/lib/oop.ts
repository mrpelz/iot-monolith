/* eslint-disable @typescript-eslint/no-explicit-any */

export type Constructor<T> = { new (...args: any[]): T };

export type EmptyObject = Record<string | symbol, any>;
export type ObjectValues<T extends EmptyObject> = T[keyof T];

// https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object/58436959#58436959
export type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never;

export type Prev = [
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

export type DeepPaths<T, D extends number = 20> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? Join<K, DeepPaths<T[K], Prev[D]>>
        : never;
    }[keyof T]
  : '';

export type DeepPathsInclusive<T, D extends number = 20> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | Join<K, DeepPaths<T[K], Prev[D]>>
        : never;
    }[keyof T]
  : '';

export type DeepValues<T, D extends number = 20> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: DeepValues<T[K], Prev[D]>;
    }[keyof T]
  : T;

export type DeepValuesInclusive<T, D extends number = 20> = [D] extends [never]
  ? never
  : T extends object
  ? {
      [K in keyof T]-?: T[K] | DeepValues<T[K], Prev[D]>;
    }[keyof T]
  : T;

export type DeepClassStructureViaChildField<
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
        | DeepClassStructureViaChildField<T[P][K], N, P, Prev[D]>;
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

export const objectKeys = <T extends EmptyObject>(input: T): (keyof T)[] => [
  ...Object.getOwnPropertySymbols(input),
  ...Object.getOwnPropertyNames(input),
];

export const objectValues = <T extends EmptyObject>(
  input: T
): ObjectValues<T>[] => objectKeys(input).map((property) => input[property]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rebind = (context: any, ...names: string[]): void => {
  for (const name of names) {
    const fn = context[name];
    if (typeof fn !== 'function') return;

    context[name] = fn.bind(context);
  }
};
