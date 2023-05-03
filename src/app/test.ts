import {
  Children,
  Element,
  Level,
  ValueType,
  matchClass,
  matchValue,
} from '../lib/tree/jsx/main.js';
import { Getter, selectGetter } from '../lib/tree/jsx/elements/getter.js';
import { Observable, ReadOnlyObservable } from '../lib/observable.js';
import { Setter, selectSetter } from '../lib/tree/jsx/elements/setter.js';
import { inspect } from 'util';

const testA = <C extends Children>(children: C) =>
  new Element({ level: Level.NONE, name: 'testA' }, undefined, children);

const testB = <C extends Children>(id: string, children: C) =>
  new Element({ level: Level.NONE, name: id }, undefined, children);

class TestMatcherClass<T extends string> {
  bar: T;
}

const testC = new Element(
  {
    instance: new TestMatcherClass(),
    level: Level.NONE,
    name: 'tree',
  },
  // eslint-disable-next-line no-console
  (self) => console.log(self)
);

const testD = new Getter({
  name: 'testSensor',
  state: new ReadOnlyObservable(new Observable(4)),
  valueType: ValueType.NUMBER,
});

const foo = testA([
  testB(
    '2nd',
    testB(
      '3rd',
      testB(
        '4th',
        testA(),
        testC,
        testD,
        new Setter({
          name: 'testActuator',
          setState: new Observable('test'),
          topic: 'foo',
          valueType: ValueType.STRING,
        })
      )
    )
  ),
  testA(),
] as const);

const matchFirst = foo.matchFirstChild(
  undefined,
  {
    name: [matchValue, 'tree' as const],
  },
  -1
);

const matchAll = foo.matchAllChildren(
  undefined,
  {
    instance: [matchClass, TestMatcherClass],
  },
  -1
);

const selectionGetter = foo.matchAllChildren(
  undefined,
  selectGetter(ValueType.NUMBER),
  -1
);
const selectionSetter = foo.matchAllChildren(
  undefined,
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
