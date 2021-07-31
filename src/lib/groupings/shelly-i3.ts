import { hello, online } from './metrics.js';
import { Button } from '../items/button.js';
import { Button as ButtonEvent } from '../events/button.js';
import { UDPDevice } from '../device/udp.js';
import { metadataStore } from '../hierarchy.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const shellyi3 = (host: string, port = 1337) => {
  const device = new UDPDevice(host, port);

  const children = {
    button0: { $: new Button(device.addEvent(new ButtonEvent(0))) },
    button1: { $: new Button(device.addEvent(new ButtonEvent(1))) },
    button2: { $: new Button(device.addEvent(new ButtonEvent(2))) },
  };

  const result = {
    ...children,
    ...hello(device),
    ...online(device),
  };

  metadataStore.set(result, {
    name: 'shelly-i3',
  });

  return result;
};
