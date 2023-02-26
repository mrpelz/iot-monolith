import { Component, fragment, h } from '../lib/tree/jsx.js';
import { Root } from '../lib/tree/jsx/root.js';
import { inspect } from 'util';

const TestA: Component = ({ children }) => <base>{children}</base>;
const TestB: Component = ({ children }) => <base>{children}</base>;

const foo = (
  <TestA>
    <TestB>
      <TestB>
        <TestB>
          <base />
          <TestA />
          <Root />
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
