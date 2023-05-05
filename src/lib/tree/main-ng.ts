import { objectProperties } from '../oop.js';
import { v5 as uuidv5 } from 'uuid';

const TREE_UUID_NAMESPACE = '3908a9a5-cae8-4c7a-901f-6a02bb40a915';

export const symbolId = Symbol('id');
export const symbolKey = Symbol('key');
export const symbolMain = Symbol('main');
export const symbolSpecies = Symbol('species');

export const symbolLevel = Symbol('level');
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

export const symbolValueType = Symbol('valueType');
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

export type AbstractClass = abstract new (...args: unknown[]) => unknown;
export type ExtractProperties<T, F> = {
  [P in keyof T as T[P] extends F ? P : never]: T[P];
};

export type Children = Record<string, Element>;
export type InitFunction<T extends Element> = (self: T) => void;

export type Props = Record<string | symbol, unknown> & {
  [symbolLevel]?: Level;
  [symbolSpecies]?: symbol;
  [symbolValueType]?: ValueType;
};

export type InstanceMap<T extends Props> = {
  [P in keyof T]: T[P] extends AbstractClass ? InstanceType<T[P]> : T[P];
};

export type MatcherFunction<T> = (a: T, b: unknown) => boolean;
export type MatcherFunctionTuple<T> = readonly [MatcherFunction<T>, ...T[]];
export type MatcherProps = Record<string, MatcherFunctionTuple<unknown>>;
export type MatcherPropsMap<T extends MatcherProps> = {
  [P in keyof T]: Exclude<T[P][number], T[P][0]>;
};

export class Element<T extends Props = Record<string | symbol, unknown>> {
  private _hasBeenInitialized = false;
  private _id?: string;
  private _key?: string;
  private _parent?: Element;
  private _path?: string[];

  constructor(
    private readonly _props: T,
    private readonly _initCallback?: InitFunction<Element<T>>
  ) {
    Object.freeze(this._props);
  }

  private _handleChildren(
    childCallback: (child: Element, property: string) => void
  ) {
    for (const property of objectProperties(this.children)) {
      const child = this.children[property];

      if (child instanceof Element) {
        childCallback(
          child,
          (() => {
            if ((property as symbol) === symbolMain) return '$';
            if (typeof property === 'string') return property;
            if (typeof property === 'symbol') {
              return `$${(property as symbol).description || '_'}`;
            }

            return '_';
          })()
        );
      }
    }
  }

  get children(): ExtractProperties<T, Element> {
    return Object.fromEntries(
      objectProperties(this._props)
        .filter((property) => this._props[property] instanceof Element)
        .map((property) => [property, this._props[property]] as const)
    ) as ExtractProperties<T, Element>;
  }

  get parent(): Element | undefined {
    return this._parent;
  }

  get props(): T & { [symbolId]?: string; [symbolKey]?: string } {
    return { [symbolId]: this._id, [symbolKey]: this._key, ...this._props };
  }

  init(parent?: Element, key = '^', path = [] as readonly string[]): void {
    if (this._hasBeenInitialized) return;
    this._hasBeenInitialized = true;

    this._parent = parent;
    this._key = key;
    this._path = [...path, this._key];

    this._id = uuidv5(this._path.join('\0'), TREE_UUID_NAMESPACE);

    this._handleChildren((child, property) =>
      child.init(this, property, this._path)
    );

    this._initCallback?.(this);
  }

  match<M extends MatcherProps>(
    props?: M
  ): this is Element<InstanceMap<MatcherPropsMap<M>>> {
    if (!props) return true;

    for (const property of objectProperties(props)) {
      const [matcher, ...values] = props[property];
      const b = this.props[property as string];

      if (values.some((a) => matcher(a, b))) continue;
      return false;
    }

    return true;
  }

  matchAllChildren<M extends MatcherProps>(
    props?: M,
    depth = 1
  ): (Element<InstanceMap<MatcherPropsMap<M>>> | undefined)[] {
    const directMatch =
      Object.values(this.children).filter(
        (child): child is Element<InstanceMap<MatcherPropsMap<M>>> =>
          child instanceof Element && child.match(props)
      ) || [];

    if (!depth || !directMatch) return directMatch;

    const indirectMatch = [
      directMatch,
      Object.values(this.children)
        .map((child) =>
          child instanceof Element
            ? child.matchAllChildren(props, depth - 1)
            : []
        )
        .flat(1) || [],
    ].flat(1);

    return indirectMatch;
  }

  matchFirstChild<M extends MatcherProps>(
    props?: M,
    depth = 1
  ): Element<InstanceMap<MatcherPropsMap<M>>> | undefined {
    const directMatch = Object.values(this.children).find(
      (child): child is Element<InstanceMap<MatcherPropsMap<M>>> =>
        child instanceof Element && child.match(props)
    );

    if (directMatch) return directMatch;
    if (!this.children || !depth) return undefined;

    for (const child of Object.values(this.children)) {
      const match =
        child instanceof Element && child.matchFirstChild(props, depth - 1);

      if (match) return match;
    }

    return undefined;
  }

  matchParent<M extends MatcherProps>(
    props?: M,
    depth = -1
  ): Element<InstanceMap<MatcherPropsMap<M>>> | undefined {
    if (!this._parent) return undefined;

    const directMatch = this._parent.match(props);

    if (directMatch) {
      return this._parent as Element<InstanceMap<MatcherPropsMap<M>>>;
    }

    if (!depth) return undefined;

    return this._parent.matchParent(props, depth - 1);
  }
}

export const matchClass = <M extends AbstractClass>(
  a: M | undefined,
  b: unknown
): b is InstanceType<M> => {
  if (a === undefined) return true;
  return b instanceof a;
};

export const matchValue = <M>(a: M | undefined, b: unknown): b is M => {
  if (a === undefined) return true;
  return a === b;
};
