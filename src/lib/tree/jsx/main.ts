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

export type Children = Element[];
export type InitFunction = (self: Element) => void;

export type BuiltinProps<L extends Level = Level, N extends string = string> = {
  level: L;
  name: N;
};
export type Props = Omit<Record<string, unknown>, keyof BuiltinProps>;
export type CombinedProps<T extends Props = Props> = T & BuiltinProps;

export type AbstractClass = abstract new (...args: unknown[]) => unknown;
export type InstanceMap<T extends Props> = {
  [K in keyof T]: T[K] extends AbstractClass ? InstanceType<T[K]> : T[K];
};

export type MatcherFunction<T> = (a: T, b: unknown) => boolean;
export type MatcherFunctionTuple<T> = readonly [MatcherFunction<T>, ...T[]];
export type MatcherFunctionMap<T> = {
  [K in keyof T]: MatcherFunctionTuple<T[K]>;
};

export type MatcherProps<T> = MatcherFunctionMap<Partial<T>>;

export class Element<T extends Props = Props, C extends Children = Children> {
  private readonly _children: Set<C[number]>;
  private _hasBeenInitialized = false;
  private _parent?: Element;

  constructor(
    public readonly props: CombinedProps<T>,
    public readonly initCallback?: InitFunction,
    children?: readonly C
  ) {
    Object.freeze(this.props);

    if (children) {
      const flattenedChildren = Array.isArray(children)
        ? children.flat()
        : [children];

      const names: string[] = [];

      for (const child of flattenedChildren) {
        const {
          props: { name },
        } = child;

        if (names.includes(name as string)) {
          throw new Error(
            `parent element (${this}) contains child (${child}) with duplicated name "${name}"`
          );
        }

        names.push(name as string);
      }

      this._children = new Set(flattenedChildren);
    }
  }

  private _handleChildren(childCallback: (child: Element) => void) {
    for (const child of this.children) {
      childCallback(child);
    }
  }

  get children(): Element[] {
    return Array.from(this._children);
  }

  get parent(): Element | undefined {
    return this._parent;
  }

  init(parent?: Element): void {
    if (this._hasBeenInitialized) return;
    this._hasBeenInitialized = true;

    this._parent = parent;

    this._handleChildren((child) => child.init(this));

    this.initCallback?.(this);
  }

  matchAllChildren<AC extends AbstractClass, M extends Props>(
    aClass?: AC,
    props?: MatcherProps<M>,
    depth = 1
  ): (Element<InstanceMap<M>> | undefined)[] {
    const directMatch =
      this.children.filter(
        (child): child is Element<InstanceMap<M>> =>
          child.matchClass(aClass) && child.matchProps(props)
      ) || [];
    if (!depth || !directMatch) return directMatch;

    const indirectMatch = [
      directMatch,
      this.children
        .map((child) => child.matchAllChildren(aClass, props, depth - 1))
        .flat(1) || [],
    ].flat(1);

    return indirectMatch;
  }

  matchClass<AC extends AbstractClass>(aClass?: AC): this is InstanceType<AC> {
    if (aClass === undefined) return true;
    return this instanceof aClass;
  }

  matchFirstChild<AC extends AbstractClass, M extends Props>(
    aClass?: AC,
    props?: MatcherProps<M>,
    depth = 1
  ): Element<InstanceMap<M>> | undefined {
    const directMatch = this.children.find(
      (child): child is Element<InstanceMap<M>> =>
        child.matchClass(aClass) && child.matchProps(props)
    );

    if (directMatch) return directMatch;
    if (!this.children || !depth) return undefined;

    for (const child of this.children) {
      const match = child.matchFirstChild(aClass, props, depth - 1);
      if (match) return match;
    }

    return undefined;
  }

  matchParent<AC extends AbstractClass, M extends Props>(
    aClass?: AC,
    props?: MatcherProps<M>,
    depth = -1
  ): Element<InstanceMap<M>> | undefined {
    if (!this._parent) return undefined;

    const directMatch =
      this._parent.matchClass(aClass) && this._parent.matchProps(props);

    if (directMatch) return this._parent as Element<InstanceMap<M>>;
    if (!depth) return undefined;

    return this._parent.matchParent(aClass, props, depth - 1);
  }

  matchProps<M extends Props>(
    props?: MatcherProps<M>
  ): this is Element<InstanceMap<M>> {
    if (!props) return true;

    for (const property of Object.keys(props)) {
      const [matcher, ...values] = props[property];
      const b = this.props[property];

      if (values.some((a) => matcher(a, b))) continue;
      return false;
    }

    return true;
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
