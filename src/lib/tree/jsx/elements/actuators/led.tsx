import { Element, ValueType, h } from '../../main.js';
import { Setter, selectSetter } from '../setter.js';
import { ActuatorStaleness } from './actuator-staleness.js';
import { Indicator } from '../../../../services/indicator.js';
import { IpDevice } from '../../../../device/main.js';
import { Led as LedItem } from '../../../../items/led.js';
import { Led as LedService } from '../../../../services/led.js';
import { Persistence } from '../../../../persistence.js';
import { ReadOnlyObservable } from '../../../../observable.js';

export type LedProps = {
  device: IpDevice;
  index: number;
  indicator?: Indicator;
  name: string;
  persistence?: Persistence;
};

export const Led = ({
  device,
  index,
  indicator,
  name,
  persistence,
}: LedProps): Element => {
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
      actuated="light"
      init={init}
      name={name}
      setState={setOn}
      state={actualOn}
      valueType={ValueType.BOOLEAN}
    >
      <Setter
        actuated="light"
        name="brightness"
        setState={setBrightness}
        state={actualBrightness}
        valueType={ValueType.NUMBER}
      />
      <ActuatorStaleness
        device={device}
        setState={new ReadOnlyObservable(setBrightness)}
        state={actualBrightness}
      />
    </Setter>
  );
};

export const selectorLed = selectSetter(ValueType.BOOLEAN, 'light');
export const selectorLedBrightness = selectSetter(
  ValueType.NUMBER,
  'light',
  'brightness'
);
