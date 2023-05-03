import {
  ActuatorStaleness,
  matchActuatorStaleness,
} from './actuator-staleness.js';
import { Element, ValueType, h, matchValue } from '../../main.js';
import { Setter, selectGetterSetter } from '../setter.js';
import { Trigger, selectTrigger } from '../trigger.js';
import { Indicator } from '../../../../services/indicator.js';
import { IpDevice } from '../../../../device/main.js';
import { NullState } from '../../../../state.js';
import { Output as OutputItem } from '../../../../items/output.js';
import { Output as OutputService } from '../../../../services/output.js';
import { Persistence } from '../../../../persistence.js';
import { ReadOnlyObservable } from '../../../../observable.js';

const $output = Symbol('output');
const $flip = Symbol('flip');

export type OutputProps = {
  device: IpDevice;
  index: number;
  indicator?: Indicator;
  name: string;
  persistence?: Persistence;
  topic?: string;
};

export const Output = ({
  device,
  index,
  indicator,
  name,
  persistence,
  topic = 'light',
}: OutputProps) => {
  const { actualState, setState } = new OutputItem(
    device.addService(new OutputService(index)),
    indicator
  );

  const init = () => {
    if (persistence) {
      persistence.observe(
        `output/${device.transport.host}:${device.transport.port}/${index}`,
        setState
      );
    }
  };

  return (
    <Setter
      $output={$output}
      init={init}
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
      <ActuatorStaleness
        device={device}
        setState={new ReadOnlyObservable(setState)}
        state={actualState}
      />
    </Setter>
  );
};

export const selectOutput$ = <N extends string, T extends string>(
  name?: N,
  topic?: T
) => ({
  ...selectGetterSetter(ValueType.BOOLEAN, name, topic || 'light'),
  $output: [matchValue, $output] as const,
});

export const matchOutput = <N extends string, T extends string>(
  input: Element,
  name?: N,
  topic?: T
) => {
  if (!input.matchProps(selectOutput$(name, topic))) return undefined;

  return {
    $: input,
    get actuatorStaleness() {
      return matchActuatorStaleness(input);
    },
    get flip() {
      return input.matchFirstChild({
        ...selectTrigger(ValueType.NULL),
        $flip: [matchValue, $flip],
      });
    },
  };
};
