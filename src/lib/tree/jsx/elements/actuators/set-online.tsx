import { BooleanState, NullState } from '../../../../state.js';
import { Element, ValueType, h, matchValue } from '../../main.js';
import { Setter, selectGetterSetter } from '../setter.js';
import { Trigger, selectTrigger } from '../trigger.js';
import { IpDevice } from '../../../../device/main.js';
import { ReadOnlyObservable } from '../../../../observable.js';

export type SetOnlineProps = {
  device: IpDevice;
  initiallyOnline?: boolean;
};

const $setOnline = Symbol('setOnline');
const $flip = Symbol('flip');

export const SetOnline = ({
  device,
  initiallyOnline = true,
}: SetOnlineProps) => {
  const setState = new BooleanState(initiallyOnline);

  if (initiallyOnline) {
    device.transport.connect();
  }

  setState.observe((value) => {
    if (value) {
      device.transport.connect();

      return;
    }

    device.transport.disconnect();
  });

  return (
    <Setter
      $setOnline={$setOnline}
      name="setOnline"
      setState={setState}
      state={new ReadOnlyObservable(setState)}
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

export const selectorSetOnline$ = {
  ...selectGetterSetter(ValueType.BOOLEAN),
  $setOnline: [matchValue, $setOnline] as const,
};

export const matchSetOnline = (input: Element) => {
  if (!input.match(selectorSetOnline$)) return undefined;

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
