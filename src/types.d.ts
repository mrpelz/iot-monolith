declare namespace JSX {
  type Element = import('./lib/tree/jsx/main').Element;
  type ElementChildrenAttribute = Record<'children', never>
  type IntrinsicElements = Record<'element', import('./lib/tree/jsx/main').CombinedProps>
}
