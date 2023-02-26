type InitFunction = (self: Base) => void;

export type Props = {
  children?: JSX.Element | JSX.Element[];
  init?: InitFunction;
};

export class Base {
  readonly children?: Set<Base>;
  readonly init?: InitFunction;
  readonly props: Omit<Props, 'children' | 'init'>;

  constructor(propsWithChildren: Props) {
    const { children, init, ...props } = propsWithChildren;

    this.children = children
      ? new Set(Array.isArray(children) ? children.flat() : [children])
      : undefined;

    this.init = init;
    this.props = props;
  }
}

class Fragment extends Base {}

const intrinsicElements = {
  base: Base,
} as const;

export type IntrinsicElements = typeof intrinsicElements;

export type Component<P = Record<string, unknown>> = (
  props: P & { children?: JSX.Element | JSX.Element[] }
) => Base;

export const h = <T extends keyof JSX.IntrinsicElements>(
  component: T | Component<JSX.IntrinsicElements[T]>,
  props: Omit<JSX.IntrinsicElements[T], 'children'>,
  ...children: JSX.Element[]
): JSX.Element => {
  const propsWithChildren = { ...props, children };

  if (typeof component === 'string') {
    return new intrinsicElements[component](propsWithChildren);
  }

  return component(propsWithChildren);
};

export const fragment: Component<Record<string, never>> = (props): Fragment =>
  new Fragment(props);
