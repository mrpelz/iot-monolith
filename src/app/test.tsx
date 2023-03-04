import { Actuator, selectActuator } from '../lib/tree/jsx/elements/actuator.js';
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
import { Observable, ReadOnlyObservable } from '../lib/observable.js';
import { Sensor, selectSensor } from '../lib/tree/jsx/elements/sensor.js';
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

const foo = (
  <TestA>
    <TestB id="2nd">
      <TestB id="3rd">
        <TestB id="4th">
          <TestA />
          {testC}
          <>
            <Sensor
              name="testSensor"
              observable={new ReadOnlyObservable(new Observable(4))}
              valueType={ValueType.NUMBER}
            />
            <Actuator
              name="testActuator"
              actuated="foo"
              observable={new Observable('test')}
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

const matchFirst = foo.matchFirstChild({
  name: [matchValue, 'tree' as const],
});

const matchAll = foo.matchAllChildren({
  instance: [matchClass, TestMatcherClass],
});

const selectionGetter = foo.matchAllChildren(selectSensor(ValueType.NUMBER));
const selectionSetter = foo.matchAllChildren(selectActuator(ValueType.STRING));

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
