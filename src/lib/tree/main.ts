import {
  DeepValuesInclusive,
  isObject,
  isPlainObject,
  objectKeys,
  objectValues,
  Prev,
  Primitive,
} from '../oop.js';

export const DEFAULT_MATCH_DEPTH = 6;

export type TExclude = { $exclude: true };

export type SymbolizedAny = unknown;
export const any = Symbol('any') as SymbolizedAny;
export type SymbolizedBigint = bigint;
export const anyBigint = Symbol('bigint') as unknown as SymbolizedBigint;
export type SymbolizedBoolean = boolean;
export const anyBoolean = Symbol('boolean') as unknown as SymbolizedBoolean;
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type SymbolizedFunction = Function;
export const anyFunction = Symbol('function') as unknown as SymbolizedFunction;
export type SymbolizedNumber = number;
export const anyNumber = Symbol('number') as unknown as SymbolizedNumber;
export type SymbolizedString = string;
export const anyString = Symbol('string') as unknown as SymbolizedString;

export type Match<
  M extends object,
  R extends object,
  D extends number = typeof DEFAULT_MATCH_DEPTH,
> = Extract<DeepValuesInclusive<R, TExclude | Primitive, D>, M>;

export enum Level {
  NONE,
  SYSTEM,
  HOME,
  BUILDING,
  FLOOR,
  ROOM,
  AREA,
  DEVICE,
  PROPERTY,
  ELEMENT,
}

export enum ValueType {
  NULL,
  BOOLEAN,
  NUMBER,
  STRING,
  RAW,
}

export type TValueType = {
  [ValueType.BOOLEAN]: boolean;
  [ValueType.NULL]: null;
  [ValueType.NUMBER]: number;
  [ValueType.RAW]: unknown;
  [ValueType.STRING]: string;
};

export const descriptionValueType = {
  boolean: ValueType.BOOLEAN,
  null: ValueType.NULL,
  number: ValueType.NUMBER,
  string: ValueType.STRING,
  unknown: ValueType.RAW,
} as const;

export const valueTypeDescription = {
  [ValueType.BOOLEAN]: 'boolean',
  [ValueType.NULL]: 'null',
  [ValueType.NUMBER]: 'number',
  [ValueType.RAW]: 'unknown',
  [ValueType.STRING]: 'string',
} as const;

export const isValueType = <T extends ValueType>(
  value: unknown,
  type: T,
): value is TValueType[T] => {
  switch (type) {
    case ValueType.NULL: {
      return value === null;
    }
    case ValueType.BOOLEAN: {
      return typeof value === 'boolean';
    }
    case ValueType.NUMBER: {
      return typeof value === 'number';
    }
    case ValueType.STRING: {
      return typeof value === 'string';
    }
    case ValueType.RAW: {
      return typeof value === 'object';
    }
    default: {
      return false;
    }
  }
};

export const isLocalMatch = <P extends object, R extends object>(
  pattern: P,
  root: R,
): root is R & P => {
  for (const key of objectKeys(pattern)) {
    const b = pattern[key];
    if (b === any && key in root) continue;

    const a = root[key as unknown as keyof R] as unknown;
    if (b === anyBigint && typeof a === 'bigint') continue;
    if (b === anyBoolean && typeof a === 'boolean') continue;
    if (b === anyFunction && typeof a === 'function') continue;
    if (b === anyNumber && typeof a === 'number') continue;
    if (b === anyString && typeof a === 'string') continue;

    if (a === b) continue;

    return false;
  }

  return true;
};

export const match = <
  P extends object,
  R,
  D extends number = typeof DEFAULT_MATCH_DEPTH,
>(
  pattern: P,
  root: R,
  depth = DEFAULT_MATCH_DEPTH as D,
  limitToPlainObjects = true,
): Match<P, Extract<R, object>, D>[] => {
  if (depth < 0) return [];

  const root_ = (limitToPlainObjects ? isPlainObject : isObject)(root)
    ? root
    : undefined;

  if (!root_) return [];
  if ('$exclude' in root_ && root_.$exclude === true) return [];

  const localMatch = isLocalMatch(pattern, root_) ? [root] : [];

  const nextDepth = (depth - 1) as Prev[D];
  const childMatch = objectValues(root_).flatMap((child) =>
    match(pattern, child, nextDepth),
  );

  return [localMatch, childMatch].flat(1) as Match<P, Extract<R, object>, D>[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const roomDevices = match(
  {} as const,
  { foo: 'bar', zaz: { $exclude: true, boo: 'bah' } } as const,
);
