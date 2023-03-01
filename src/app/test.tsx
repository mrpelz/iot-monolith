import { Children, Component, Element, fragment, h } from '../lib/tree/jsx.js';
import { inspect } from 'util';

const TestA: Component<{ children?: Children }> = ({ children }) => (
  <element id="testA">{children}</element>
);
const TestB: Component<{ children: Children; id: string }> = ({
  children,
  id,
}) => <element id={id}>{children}</element>;

class TestMatcherClass {}

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
  id: [Element.matchValue, 'tree' as const],
});

const matchAll = foo.matchAllChildren({
  instance: [Element.matchClass, TestMatcherClass],
});

// eslint-disable-next-line no-console
console.log(foo.props, inspect(foo, undefined, null));

// eslint-disable-next-line no-console
console.log('match', inspect({ matchAll, matchFirst }, undefined, null));
