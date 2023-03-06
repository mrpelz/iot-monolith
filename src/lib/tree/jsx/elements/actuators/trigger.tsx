import { Element, ValueType, h, matchValue } from '../../main.js';
import { Trigger as TriggerElement, selectTrigger } from '../trigger.js';
import { NullState } from '../../../../state.js';

const $trigger = Symbol('trigger');

export type TriggerProps = {
  handler: () => void;
  topic: string;
};

export const Trigger = ({ handler, topic }: TriggerProps) => (
  <TriggerElement
    $trigger={$trigger}
    name="trigger"
    nullState={new NullState(() => handler())}
    topic={topic}
    valueType={ValueType.NULL}
  />
);

export const selectTrigger$ = <T extends string>(topic: T) => ({
  ...selectTrigger(ValueType.NULL, undefined, topic),
  $trigger: [matchValue, $trigger] as const,
});

export const matchTrigger = <T extends string>(input: Element, topic: T) => {
  if (!input.match(selectTrigger$(topic))) return undefined;

  return {
    $: input,
  };
};
