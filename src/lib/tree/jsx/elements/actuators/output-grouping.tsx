import {
  BooleanGroupStrategy,
  BooleanNullableStateGroup,
  BooleanStateGroup,
  NullState,
} from '../../../../state.js';
import { Children, Element, ValueType, h, matchValue } from '../../main.js';
import { Setter, selectGetterSetter } from '../setter.js';
import { Trigger, selectTrigger } from '../trigger.js';
import { ReadOnlyObservable } from '../../../../observable.js';
import { matchLed } from './led.js';
import { matchOutput } from './output.js';

export type OutputGroupingProps = {
  children: Children;
  name: string;
  topic?: string;
};

const $outputGrouping = Symbol('outputGrouping');
const $flip = Symbol('flip');

export const OutputGrouping = ({
  children,
  name,
  topic = 'light',
}: OutputGroupingProps) => {
  const items = [
    (Array.isArray(children) ? children : [children]).map((item) =>
      matchOutput(item)
    ),
    (Array.isArray(children) ? children : [children]).map((item) =>
      matchLed(item)
    ),
  ]
    .flat()
    .filter((item): item is Exclude<typeof item, undefined> => Boolean(item));

  const actualState = new ReadOnlyObservable(
    new BooleanNullableStateGroup(
      BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
      items.map((item) => item.$.props.state)
    )
  );

  const setState = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    items.map((item) => item.$.props.setState)
  );

  return (
    <Setter
      $outputGrouping={$outputGrouping}
      name={name}
      setState={setState}
      state={actualState}
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

export const selectOutputGrouping$ = <N extends string, T extends string>(
  name?: N,
  topic?: T
) => ({
  ...selectGetterSetter(ValueType.BOOLEAN, name, topic || 'light'),
  $outputGrouping: [matchValue, $outputGrouping] as const,
});

export const matchOutputGrouping = <N extends string, T extends string>(
  input: Element,
  name?: N,
  topic?: T
) => {
  if (!input.matchProps(selectOutputGrouping$(name, topic))) return undefined;

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
