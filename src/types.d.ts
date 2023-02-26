declare namespace JSX {
  type Element = import('./lib/tree/jsx').Base;
  // type ElementAttributesProperty = Record<'props', never>
  type ElementChildrenAttribute = Record<'children', never>
}
