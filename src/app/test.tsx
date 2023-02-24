import { JSX, fragment, h } from '../lib/tree/jsx.js';
import { inspect } from 'util';

const TestA: JSX.Component<{ bar: string }> = ({ children, bar }) => ({
  bar,
  children,
});

const TestB: JSX.Component = () => null;

const foo = (
  <TestA bar="a">
    <>
      <>
        <>
          <TestB>
            <TestB>
              <TestB>
                <TestA bar="b" />
              </TestB>
            </TestB>
          </TestB>
          <TestA bar="b" />
        </>
      </>
    </>
  </TestA>
);

// eslint-disable-next-line no-console
console.log(inspect(foo, undefined, null));

// eslint-disable-next-line no-console
console.log(inspect(, undefined, null));
