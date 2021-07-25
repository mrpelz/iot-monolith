import { hello, online } from './metrics.js';
import { Button } from '../items/button.js';
import { Button as ButtonEvent } from '../events/button.js';
import { Meta } from '../hierarchy.js';
import { UDPDevice } from '../device/udp.js';
import { output } from './actuators.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const obiPlug = (host: string, port = 1337) => {
  const device = new UDPDevice(host, port);
  const relay = output(device, 0, true);

  const button = new Button(device.addEvent(new ButtonEvent(0)));

  return {
    children: {
      button,
    },
    meta: <Meta>{
      name: 'obi-plug',
    },
    nodes: {
      ...hello(device),
      ...online(device),
      relay,
    },
  };
};
