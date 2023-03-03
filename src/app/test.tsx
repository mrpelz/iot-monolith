import {
  Children,
  Component,
  fragment,
  h,
  matchClass,
  matchValue,
} from '../lib/tree/jsx/main.js';
import { inspect } from 'util';

const TestA: Component<{ children?: Children }> = ({ children }) => (
  <element id="testA">{children}</element>
);
const TestB: Component<{ children: Children; id: string }> = ({
  children,
  id,
}) => <element id={id}>{children}</element>;

class TestMatcherClass<T extends string> {
  bar: T;
}

const testC = (
  <element
    id="tree"
    instance={new TestMatcherClass()}
    // eslint-disable-next-line no-console
    init={(self) => console.log(self)}
  />
);

const foo = (
  <TestA>
    <TestB id="2nd">
      <TestB id="3rd">
        <TestB id="4th">
          <TestA />
          {testC}
        </TestB>
      </TestB>
    </TestB>
    <>
      <TestA />
    </>
  </TestA>
);

foo.init();

const matchFirst = foo.matchFirstChild({
  id: [matchValue, 'tree' as const],
});

const matchAll = foo.matchAllChildren<{
  id: 'tree';
  instance: typeof TestMatcherClass<'foo'>;
}>({
  id: [matchValue, 'tree'],
  instance: [matchClass, TestMatcherClass],
});

// eslint-disable-next-line no-console
console.log(foo.props, inspect(foo, undefined, null));

// eslint-disable-next-line no-console
console.log('match', inspect({ matchAll, matchFirst }, undefined, null));
