import {
  ActuatorStaleness,
  matchActuatorStaleness,
} from './actuator-staleness.js';
import { Element, ValueType, h, matchValue } from '../../main.js';
import { Setter, selectGetterSetter } from '../setter.js';
import { Trigger, selectTrigger } from '../trigger.js';
import { Indicator } from '../../../../services/indicator.js';
import { IpDevice } from '../../../../device/main.js';
import { Led as LedItem } from '../../../../items/led.js';
import { Led as LedService } from '../../../../services/led.js';
import { NullState } from '../../../../state.js';
import { Persistence } from '../../../../persistence.js';
import { ReadOnlyObservable } from '../../../../observable.js';

export type LedProps = {
  device: IpDevice;
  index: number;
  indicator?: Indicator;
  name: string;
  persistence?: Persistence;
};

const $led = Symbol('led');
const $brightness = Symbol('brightness');
const $flip = Symbol('flip');

export const Led = ({
  device,
  index,
  indicator,
  name,
  persistence,
}: LedProps) => {
  const { actualBrightness, actualOn, setBrightness, setOn } = new LedItem(
    device.addService(new LedService(index)),
    indicator
  );

  const init = () => {
    if (persistence) {
      persistence.observe(
        `led/${device.transport.host}:${device.transport.port}/${index}`,
        setBrightness
      );
    }
  };

  return (
    <Setter
      $led={$led}
      init={init}
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
      <ActuatorStaleness
        device={device}
        setState={new ReadOnlyObservable(setBrightness)}
        state={actualBrightness}
      />
    </Setter>
  );
};

export const selectLed$ = <N extends string>(name?: N) => ({
  ...selectGetterSetter(ValueType.BOOLEAN, name, 'light'),
  $led: [matchValue, $led] as const,
});

export const matchLed = <N extends string>(input: Element, name?: N) => {
  if (!input.match(selectLed$(name))) return undefined;

  const brightness = input.matchFirstChild({
    ...selectGetterSetter(ValueType.NUMBER),
    $brightness: [matchValue, $brightness],
  });
  if (!brightness) return undefined;

  return {
    $: input,
    get actuatorStaleness() {
      return matchActuatorStaleness(input);
    },
    brightness,
    get flip() {
      return input.matchFirstChild({
        ...selectTrigger(ValueType.NULL),
        $flip: [matchValue, $flip],
      });
    },
  };
};
