import { Setter, selectSetter } from '../setter.js';
import { ValueType, h } from '../../main.js';
import { Indicator } from '../../../../services/indicator.js';
import { IpDevice } from '../../../../device/main.js';
import { Output as OutputItem } from '../../../../items/output.js';
import { Output as OutputService } from '../../../../services/output.js';
import { Persistence } from '../../../../persistence.js';

export type OutputProps = {
  actuated?: string;
  device: IpDevice;
  index: number;
  indicator?: Indicator;
  name: string;
  persistence?: Persistence;
};

export const Output = ({
  actuated = 'light',
  device,
  index,
  indicator,
  name,
  persistence,
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
      actuated={actuated}
      init={init}
      name={name}
      setState={setState}
      state={actualState}
      valueType={ValueType.BOOLEAN}
    />
  );
};

export const selectorOutput = selectSetter(ValueType.BOOLEAN);
