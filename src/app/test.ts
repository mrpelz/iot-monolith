import {
  Children,
  Element,
  Level,
  ValueType,
  matchClass,
  matchValue,
} from '../lib/tree/main-ng.js';
import { Observable, ReadOnlyObservable } from '../lib/observable.js';
import { getter, selectGetter } from '../lib/tree/elements/getter.js';
import { selectSetter, setter } from '../lib/tree/elements/setter.js';
import { inspect } from 'node:util';

const testA = <C extends Children>(children = {} as C) =>
  new Element({ level: Level.NONE, name: 'testA', ...children });

const testB = <C extends Children>(id: string, children = {} as C) =>
  new Element({ level: Level.NONE, name: id, ...children });

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

const testD = getter({
  name: 'testSensor',
  state: new ReadOnlyObservable(new Observable(4)),
  valueType: ValueType.NUMBER,
});

const foo = testA({
  a: testB('2nd', {
    a: testB('3rd', {
      a: testB('4th', {
        a: testA(),
        b: testC,
        c: testD,
        d: setter({
          name: 'testActuator',
          setState: new Observable('test'),
          topic: 'foo',
          valueType: ValueType.STRING,
        }),
      }),
    }),
  }),
  b: testA(),
} as const);

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
