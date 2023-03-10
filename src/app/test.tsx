import {
  Children,
  Component,
  Level,
  ValueType,
  fragment,
  h,
  matchClass,
  matchValue,
} from '../lib/tree/jsx/main.js';
import { Getter, selectGetter } from '../lib/tree/jsx/elements/getter.js';
import { Observable, ReadOnlyObservable } from '../lib/observable.js';
import { Setter, selectSetter } from '../lib/tree/jsx/elements/setter.js';
import { inspect } from 'util';

const TestA: Component<{ children?: Children }> = ({ children }) => (
  <element level={Level.NONE} name="testA">
    {children}
  </element>
);
const TestB: Component<{ children: Children; id: string }> = ({
  children,
  id,
}) => (
  <element level={Level.NONE} name={id}>
    {children}
  </element>
);

class TestMatcherClass<T extends string> {
  bar: T;
}

const testC = (
  <element
    level={Level.NONE}
    name="tree"
    instance={new TestMatcherClass()}
    // eslint-disable-next-line no-console
    init={(self) => console.log(self)}
  />
);

const testD = (
  <Getter
    name="testSensor"
    state={new ReadOnlyObservable(new Observable(4))}
    valueType={ValueType.NUMBER}
  />
);

const foo = (
  <TestA>
    <TestB id="2nd">
      <TestB id="3rd">
        <TestB id="4th">
          <TestA />
          {testC}
          <>
            {testD}
            <Setter
              name="testActuator"
              setState={new Observable('test')}
              topic="foo"
              valueType={ValueType.STRING}
            />
          </>
        </TestB>
      </TestB>
    </TestB>
    <>
      <TestA />
    </>
  </TestA>
);

const matchFirst = foo.matchFirstChild(
  {
    name: [matchValue, 'tree' as const],
  },
  -1
);

const matchAll = foo.matchAllChildren(
  {
    instance: [matchClass, TestMatcherClass],
  },
  -1
);

const selectionGetter = foo.matchAllChildren(
  selectGetter(ValueType.NUMBER),
  -1
);
const selectionSetter = foo.matchAllChildren(
  selectSetter(ValueType.STRING),
  -1
);

// eslint-disable-next-line no-console
console.log(
  'match',
  inspect(
    { matchAll, matchFirst, selectionGetter, selectionSetter },
    undefined,
    null
  )
);

foo.init();

// eslint-disable-next-line no-console
console.log(inspect(foo, undefined, null));
