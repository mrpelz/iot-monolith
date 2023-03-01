export type Children = Element | Element[];
export type InitFunction = (self: Element) => void;

export type BuiltinProps = {
  children?: Children;
  init?: InitFunction;
};
export type AdditionalProps = Omit<Record<string, unknown>, keyof BuiltinProps>;
export type Props<T extends AdditionalProps = AdditionalProps> = T &
  BuiltinProps;

type AbstractClass = abstract new (...args: unknown[]) => unknown;
type InstanceMap<T extends AdditionalProps> = {
  [K in keyof T]: T[K] extends AbstractClass ? InstanceType<T[K]> : T[K];
};

export type MatcherFunction<T> = (a: T, b: unknown) => boolean;
export type MatcherFunctionMap<T> = {
  [K in keyof T]: readonly [MatcherFunction<T[K]>, T[K]];
};

export class Element<T extends AdditionalProps = AdditionalProps> {
  static matchClass<M extends AbstractClass>(
    a: M,
    b: unknown
  ): b is InstanceType<M> {
    return b instanceof a;
  }

  static matchValue<M>(a: M, b: unknown): b is M {
    return a === b;
  }

  private readonly _children?: Set<Element>;
  private _parent?: Element;

  readonly initCallback?: InitFunction;
  readonly props: T;

  constructor(props: Props<T>) {
    const { children, init } = props;

    this._children = children
      ? new Set(Array.isArray(children) ? children.flat() : [children])
      : undefined;

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
    this._parent = parent;

    this._handleChildren((child) => child.init(this));

    this.initCallback?.(this);
  }

  match<M extends AdditionalProps>(
    props: MatcherFunctionMap<Partial<M>>
  ): this is Element<InstanceMap<M>> {
    for (const property of Object.keys(props)) {
      const [matcher, a] = props[property];
      const b = this.props[property];

      if (!matcher(a, b)) return false;
    }

    return true;
  }

  matchAllChildren<M extends AdditionalProps>(
    props: MatcherFunctionMap<M>,
    depth = -1
  ): Element<InstanceMap<M>>[] {
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

  matchFirstChild<M extends AdditionalProps>(
    props: MatcherFunctionMap<M>,
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
}

export type Component<T = Record<never, never>> = (props: T) => Element;

export const h = <
  PC extends AdditionalProps,
  PF extends Record<string, unknown>,
  C extends keyof JSX.IntrinsicElements,
  F extends Component<PF>,
  T extends C | F,
  P extends T extends C ? PC : PF
>(
  component: T,
  props: Omit<P, 'children'> | null,
  ...children: Element[]
): Element => {
  const propsWithChildren = { ...props, children } || {};

  if (typeof component === 'string') {
    return new Element(propsWithChildren);
  }

  return component(propsWithChildren as unknown as PF);
};

export const fragment: Component = (props): Element => new Element(props);
