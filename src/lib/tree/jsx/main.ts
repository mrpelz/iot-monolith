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

export type Children = Element | Element[];
export type InitFunction = (self: Element) => void;

export type BuiltinProps = {
  children?: Children;
  init?: InitFunction;
  level: Level;
  name: string;
};
export type Props = Omit<Record<string, unknown>, keyof BuiltinProps>;
export type CombinedProps<T extends Props = Props> = T & BuiltinProps;

type AbstractClass = abstract new (...args: unknown[]) => unknown;
type InstanceMap<T extends Props> = {
  [K in keyof T]: T[K] extends AbstractClass ? InstanceType<T[K]> : T[K];
};

export type MatcherFunction<T> = (a: T, b: unknown) => boolean;
export type MatcherFunctionTuple<T> = readonly [MatcherFunction<T>, ...T[]];
export type MatcherFunctionMap<T> = {
  [K in keyof T]: MatcherFunctionTuple<T[K]>;
};

export type MatcherProps<T> = MatcherFunctionMap<Partial<T>>;

export class Element<T extends Props = Props> {
  private readonly _children?: Set<Element>;
  private _hasBeenInitialized = false;
  private _parent?: Element;

  readonly initCallback?: InitFunction;
  readonly props: Omit<CombinedProps<T>, 'children' | 'init'>;

  constructor(combinedProps: CombinedProps<T>) {
    const { children, init, ...props } = combinedProps;

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

    this.initCallback = init;
    this.props = props;
  }

  private _handleChildren(childCallback: (child: Element) => void) {
    if (this._children) {
      for (const child of this._children) {
        childCallback(child);
      }
    }
  }

  get children(): Element[] | undefined {
    return this._children ? Array.from(this._children) : undefined;
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

  match<M extends Props>(
    props: MatcherProps<M>
  ): this is Element<InstanceMap<M>> {
    for (const property of Object.keys(props)) {
      const [matcher, ...values] = props[property];
      const b = this.props[property];

      if (values.some((a) => matcher(a, b))) continue;
      return false;
    }

    return true;
  }

  matchAllChildren<M extends Props>(
    props: MatcherProps<M>,
    depth = -1
  ): (Element<InstanceMap<M>> | undefined)[] {
    if (!this._children) return [];

    const directMatch =
      this.children?.filter((child): child is Element<InstanceMap<M>> =>
        child.match(props)
      ) || [];
    if (!depth || !directMatch) return directMatch;

    const indirectMatch = [
      directMatch,
      this.children
        ?.map((child) => child.matchAllChildren(props, depth - 1))
        .flat(1) || [],
    ].flat(1);

    return indirectMatch;
  }

  matchFirstChild<M extends Props>(
    props: MatcherProps<M>,
    depth = -1
  ): Element<InstanceMap<M>> | undefined {
    if (!this._children) return undefined;

    const directMatch = this.children?.find(
      (child): child is Element<InstanceMap<M>> => child.match(props)
    );

    if (directMatch) return directMatch;
    if (!this.children || !depth) return undefined;

    for (const child of this.children) {
      const match = child.matchFirstChild(props, depth - 1);
      if (match) return match;
    }

    return undefined;
  }

  matchParent<M extends Props>(
    props: MatcherProps<M>,
    depth = -1
  ): Element<InstanceMap<M>> | undefined {
    if (!this._parent) return undefined;

    const directMatch = this._parent.match(props);
    if (directMatch) return this._parent as Element<InstanceMap<M>>;
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

export type Component<T = Record<never, never>> = (props: T) => Element;

export const h = (
  component: Component | 'element',
  props: Record<string, unknown> & BuiltinProps,
  ...children: Element[]
): Element => {
  const propsWithChildren = { ...props, children };

  if (typeof component === 'string') {
    return new Element(propsWithChildren);
  }

  return component(propsWithChildren);
};

export const fragment: Component = (props): Element =>
  new Element({ ...props, level: Level.NONE, name: 'fragment' });
