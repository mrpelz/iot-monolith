declare namespace JSX {
  type Element = import('./lib/tree/jsx').Base;
  type ElementChildrenAttribute = Record<'children', never>
  type IntrinsicElements = {
    base: import('./lib/tree/jsx').Props
  };
}
