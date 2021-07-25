import { Ev1527Device } from '../device/ev1527.js';
import { Ev1527Transport } from '../transport/ev1527.js';
import { Ev1527WindowSensor } from '../events/ev1527-window-sensor.js';
import { Meta } from '../hierarchy.js';
import { MultiValueEvent } from '../items/event.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const ev1527WindowSensor = (
  transport: Ev1527Transport,
  address: number
) => {
  const device = new Ev1527Device(transport, address);

  const windowSensor = new MultiValueEvent(
    device.addEvent(new Ev1527WindowSensor()),
    ['open', 'tamperSwitch']
  ).state;

  return {
    children: {
      windowSensor,
    },
    meta: <Meta>{
      name: 'ev1527-button',
    },
  };
};
