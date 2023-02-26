import { Meta } from './main.js';

type InitFunction = (self: Base) => void;

export type Children = JSX.Element | JSX.Element[];

export type Props = {
  children?: Children;
  init: InitFunction;
  meta: Meta;
};

type BuiltinProps = 'children' | 'init';

type OverrideProps<T> = Omit<T & Props, BuiltinProps>;

export class Base {
  private readonly _children?: Set<Base>;
  private readonly _init?: InitFunction;
  private readonly _props: OverrideProps<Props>;

  constructor(propsWithChildren: Props) {
    const { children, init, ...props } = propsWithChildren;

    this._children = children
      ? new Set(Array.isArray(children) ? children.flat() : [children])
      : undefined;

    this._init = init;
    this._props = props;
  }
}

class Fragment extends Base {}

const intrinsicElements = {
  base: Base,
} as const;

export type IntrinsicElements = typeof intrinsicElements;

export type Component<T = Record<never, never>> = (props: T) => Base;

export const h = <P extends Props, T extends typeof Base | Component<P>>(
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Component: T,
  props: Omit<P, 'children'>,
  ...children: JSX.Element[]
): JSX.Element => {
  const propsWithChildren = { ...props, children };

  if (
    Component.prototype instanceof Base &&
    'constructor' in Component.prototype
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return new Component(propsWithChildren);
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line new-cap
  return Component(propsWithChildren);
};

export const fragment: Component<Props> = (props): Fragment =>
  new Fragment(props);
