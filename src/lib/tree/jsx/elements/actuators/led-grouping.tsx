import {
  BooleanGroupStrategy,
  BooleanNullableStateGroup,
  BooleanStateGroup,
  NullState,
} from '../../../../state.js';
import { Children, Element, ValueType, h, matchValue } from '../../main.js';
import {
  ObservableGroup,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../../../observable.js';
import { Setter, selectGetterSetter } from '../setter.js';
import { Trigger, selectTrigger } from '../trigger.js';
import { matchLed } from './led.js';

export type LedGroupingProps = {
  children: Children;
  name: string;
};

const $ledGrouping = Symbol('ledGrouping');
const $brightness = Symbol('brightness');
const $flip = Symbol('flip');

export const LedGrouping = ({ children, name }: LedGroupingProps) => {
  const items = (Array.isArray(children) ? children : [children])
    .map((item) => matchLed(item))
    .filter((item): item is Exclude<typeof item, undefined> => Boolean(item));

  const actualOn = new ReadOnlyObservable(
    new BooleanNullableStateGroup(
      BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
      items.map((item) => item.$.props.state)
    )
  );

  const actualBrightness = new ReadOnlyObservable(
    new (class extends ObservableGroup<number> {
      protected _merge(): number {
        return this.values.reduce((a, b) => a + b, 0) / this.values.length;
      }
    })(
      0,
      items.map(
        (item) =>
          new ReadOnlyProxyObservable(item.brightness.props.state, (value) =>
            value === null ? 0 : value
          )
      )
    )
  );

  const setOn = new BooleanStateGroup(
    BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
    items.map((item) => item.$.props.setState)
  );

  const setBrightness = new (class extends ObservableGroup<number> {
    protected _merge(): number {
      return this.values.reduce((a, b) => a + b, 0) / this.values.length;
    }
  })(
    0,
    items.map((item) => item.brightness.props.setState)
  );

  return (
    <Setter
      $ledGrouping={$ledGrouping}
      name={name}
      setState={setOn}
      state={actualOn}
      topic="light"
      valueType={ValueType.BOOLEAN}
    >
      <Setter
        $brightness={$brightness}
        name="brightness"
        setState={setBrightness}
        state={actualBrightness}
        valueType={ValueType.NUMBER}
      />
      <Trigger
        $flip={$flip}
        name="flip"
        valueType={ValueType.NULL}
        nullState={new NullState(() => setOn.flip())}
      />
    </Setter>
  );
};

export const selectLedGrouping$ = <N extends string, T extends string>(
  name?: N,
  topic?: T
) => ({
  ...selectGetterSetter(ValueType.BOOLEAN, name, topic || 'light'),
  $ledGrouping: [matchValue, $ledGrouping] as const,
});

export const matchOutputGrouping = <N extends string, T extends string>(
  input: Element,
  name?: N,
  topic?: T
) => {
  if (!input.match(selectLedGrouping$(name, topic))) return undefined;

  const brightness = input.matchFirstChild({
    ...selectGetterSetter(ValueType.NUMBER),
    $brightness: [matchValue, $brightness],
  });
  if (!brightness) return undefined;

  return {
    $: input,
    brightness,
    get flip() {
      return input.matchFirstChild({
        ...selectTrigger(ValueType.NULL),
        $flip: [matchValue, $flip],
      });
    },
  };
};
