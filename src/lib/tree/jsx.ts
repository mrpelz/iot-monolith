import TreeModel, { Model, Node } from 'tree-model';

type UnknownObject = Record<string, unknown>;
type EmptyObject = Record<string, never>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type Props<P extends UnknownObject = EmptyObject> = P & {
    children?: Array<Props>;
  };

  export type Element<P extends UnknownObject = EmptyObject> =
    | Props<P>
    | EmptyObject;

  export type ComponentInstance<P extends UnknownObject = EmptyObject> =
    Element<P & { init: (node: Node<P>) => void }>;

  export type Component<P extends UnknownObject = EmptyObject> = (
    props: Props<P>
  ) => ComponentInstance<P>;
}

export const h = <
  P extends JSX.Props<UnknownObject> = JSX.Props<UnknownObject>
>(
  component: JSX.Component<P>,
  props: P,
  ...children: JSX.Element[]
): JSX.Element<P> => {
  const result = component({ ...props, children });
  if (result === null) return {};

  return result;
};

export const fragment: JSX.Component = (props) => props;

const tree = new TreeModel();

export const init = (
  input: Model<JSX.ComponentInstance>
): Node<JSX.ComponentInstance> => {
  const result = tree.parse(input);

  result.all((node) => {node.});

  return result;
};
