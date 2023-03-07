import { Element, ValueType, h, matchValue } from '../../main.js';
import { Trigger, selectTrigger } from '../trigger.js';
import {
  BooleanGroupStrategy,
  BooleanStateGroup,
  NullState,
} from '../../../../state.js';
import {
  AnyWritableObservable,
  ProxyObservable,
  ReadOnlyObservable,
} from '../../../../observable.js';
import { Setter } from '../setter.js';

const $scene = Symbol('scene');
const $flip = Symbol('flip');

export class SceneMember<T> {
  constructor(
    public readonly observable: AnyWritableObservable<T>,
    public readonly onValue: T,
    public readonly offValue?: T
  ) {}
}

export type SceneProps = {
  members: readonly SceneMember<unknown>[];
  name: string;
  topic: string;
};

export const Scene = ({ members, name, topic }: SceneProps) => {
  const proxyObservables = members.map(
    <T,>({ observable, onValue, offValue = onValue }: SceneMember<T>) =>
      new ProxyObservable<T, boolean>(
        observable,
        (value) => value === onValue,
        (on) => (observable.value = on ? onValue : offValue)
      )
  );

  const setState = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
    proxyObservables
  );

  return (
    <Setter
      $scene={$scene}
      name={name}
      setState={setState}
      state={new ReadOnlyObservable(setState)}
      topic={topic}
      valueType={ValueType.BOOLEAN}
    >
      <Trigger
        $flip={$flip}
        name="flip"
        valueType={ValueType.NULL}
        nullState={new NullState(() => setState.flip())}
      />
    </Setter>
  );
};

export const selectScene$ = <N extends string, T extends string>(
  name: N,
  topic: T
) => ({
  ...selectTrigger(ValueType.NULL, name, topic),
  $scene: [matchValue, $scene] as const,
});

export const matchScene = <N extends string, T extends string>(
  input: Element,
  name: N,
  topic: T
) => {
  if (!input.match(selectScene$(name, topic))) return undefined;

  return {
    $: input,
    get flip() {
      return input.matchFirstChild({
        ...selectTrigger(ValueType.NULL),
        $flip: [matchValue, $flip],
      });
    },
  };
};
