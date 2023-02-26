import { Children, Component, fragment, h } from '../lib/tree/jsx.js';
import { Root } from '../lib/tree/jsx/root.js';
import { inspect } from 'util';

const TestA: Component<{ children?: Children }> = ({ children }) => (
  <Root id="testA">{children}</Root>
);
const TestB: Component<{ children: Children }> = ({ children }) => (
  <Root id="testB">{children}</Root>
);

const foo = (
  <TestA>
    <TestB>
      <TestB>
        <TestB>
          <TestA />
          <Root id="tree" />
        </TestB>
      </TestB>
    </TestB>
    <>
      <TestA />
    </>
  </TestA>
);

// eslint-disable-next-line no-console
console.log(inspect(foo, undefined, null));

// eslint-disable-next-line no-console
// console.log(inspect(, undefined, null));
