/* eslint-disable @typescript-eslint/no-explicit-any */

export type Constructor<T> = { new (...args: any[]): T };

export type EmptyObject = Record<string | symbol, any>;
export type ObjectValues<T extends EmptyObject> = T[keyof T];

export type Primitive =
  | bigint
  | boolean
  | null
  | number
  | string
  | symbol
  | undefined;

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
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  48,
  49,
  50,
  ...0[],
];

// https://stackoverflow.com/a/71097605
export type Index<T, K extends string> = K extends keyof T
  ? T[K]
  : K extends `${number}`
    ? number extends keyof T
      ? T[number]
      : never
    : never;

export type DeepIndex<T, K extends string> = T extends object
  ? K extends `${infer F}.${infer R}`
    ? DeepIndex<Index<T, F>, R>
    : Index<T, K>
  : never;

export type DeepPaths<T, D extends number = 50> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]-?: K extends string | number
          ? Join<K, DeepPaths<T[K], Prev[D]>>
          : never;
      }[keyof T]
    : never;

export type DeepPathsInclusive<T, D extends number = 50> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]-?: K extends string | number
          ? `${K}` | Join<K, DeepPathsInclusive<T[K], Prev[D]>>
          : never;
      }[keyof T]
    : never;

export type DeepRemap<T extends object, S, R, D extends number = 50> = [
  D,
] extends [never]
  ? never
  : {
      [K in keyof T]: T[K] extends S
        ? R
        : T[K] extends object
          ? DeepRemap<T[K], S, R, Prev[D]>
          : T[K];
    };

export type DeepValues<T, E = never, D extends number = 50> = [D] extends [
  never,
]
  ? never
  : T extends E
    ? never
    : T extends object
      ? {
          [K in keyof T]-?: DeepValues<T[K], E, Prev[D]>;
        }[keyof T]
      : T;

export type DeepValuesInclusive<T, E = never, D extends number = 50> = [
  D,
] extends [never]
  ? never
  : T extends E
    ? never
    : T extends object
      ?
          | {
              [K in keyof T]-?: DeepValuesInclusive<T[K], E, Prev[D]>;
            }[keyof T]
          | T
      : T;

export type DeepClassStructureViaChildField<
  T,
  N extends object,
  P extends keyof N,
  D extends number = 50,
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
  classDefinition: Constructor<Record<string, unknown>>,
): string[] =>
  Object.keys(
    Object.getOwnPropertyDescriptors(classDefinition.prototype),
  ).filter((name) => name !== 'constructor' && name[0] !== '_');

export const instanceMethods = (instance: Record<string, unknown>): string[] =>
  Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(
    (name) => name !== 'constructor' && name[0] !== '_',
  );

export const isObject = (input: unknown): input is object => {
  if (typeof input !== 'object') return false;
  if (!input) return false;

  return true;
};

export const isPlainObject = (input: unknown): input is object => {
  if (!isObject(input)) return false;
  if (input.constructor.toString().startsWith('class')) return false;

  return true;
};

export const objectKeys = <T extends EmptyObject>(input: T): (keyof T)[] => [
  ...Object.getOwnPropertySymbols(input),
  ...Object.getOwnPropertyNames(input),
];

export const objectValues = <T extends EmptyObject>(
  input: T,
): ObjectValues<T>[] => objectKeys(input).map((property) => input[property]);

export const rebind = (context: any, ...names: string[]): void => {
  for (const name of names) {
    const fn = context[name];
    if (typeof fn !== 'function') return;

    context[name] = fn.bind(context);
  }
};

export type UnionToIntersection<U> = (
  U extends any ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

export const ensureKeys = <
  T extends object,
  K extends keyof UnionToIntersection<T>,
>(
  object: T,
  ...keys: K[]
): Partial<Extract<T, Record<K, any>>> => {
  const keys_ = [keys, objectKeys(object)].flat();

  const result = {} as Extract<T, Record<K, any>>;

  for (const key of keys_) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    result[key] = object[key];
  }

  return result;
};
