import { hello, online } from './metrics.js';
import { Button } from '../items/button.js';
import { Button as ButtonEvent } from '../events/button.js';
import { Meta } from '../hierarchy.js';
import { UDPDevice } from '../device/udp.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const shellyi3 = (host: string, port = 1337) => {
  const device = new UDPDevice(host, port);

  const button0 = new Button(device.addEvent(new ButtonEvent(0)));
  const button1 = new Button(device.addEvent(new ButtonEvent(1)));
  const button2 = new Button(device.addEvent(new ButtonEvent(2)));

  return {
    children: {
      button0,
      button1,
      button2,
    },
    meta: <Meta>{
      name: 'shelly-i3',
    },
    nodes: {
      ...hello(device),
      ...online(device),
    },
  };
};
