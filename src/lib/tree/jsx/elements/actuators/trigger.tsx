import { Element, ValueType, h, matchValue } from '../../main.js';
import { Trigger as TriggerElement, selectTrigger } from '../trigger.js';
import { NullState } from '../../../../state.js';

const $triggerActuator = Symbol('triggerActuator');

export type TriggerProps = {
  handler: () => void;
  name: string;
  topic: string;
};

export const Trigger = ({ handler, name, topic }: TriggerProps) => (
  <TriggerElement
    $triggerActuator={$triggerActuator}
    name={name}
    nullState={new NullState(() => handler())}
    topic={topic}
    valueType={ValueType.NULL}
  />
);

export const selectTrigger$ = <N extends string, T extends string>(
  name: N,
  topic: T
) => ({
  ...selectTrigger(ValueType.NULL, name, topic),
  $triggerActuator: [matchValue, $triggerActuator] as const,
});

export const matchTrigger = <N extends string, T extends string>(
  input: Element,
  name: N,
  topic: T
) => {
  if (!input.match(selectTrigger$(name, topic))) return undefined;

  return {
    $: input,
  };
};
