declare namespace JSX {
  type Element = import('./lib/tree/jsx').Element;
  type ElementChildrenAttribute = Record<'children', never>
  type IntrinsicElements = Record<'element', import('./lib/tree/jsx').Props>
}
