import { hello, online } from './metrics.js';
import { Button } from '../items/button.js';
import { Button as ButtonEvent } from '../events/button.js';
import { UDPDevice } from '../device/udp.js';
import { metadataStore } from '../hierarchy.js';
import { output } from './actuators.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const obiPlug = (host: string, port = 1337) => {
  const device = new UDPDevice(host, port);
  const relay = output(device, 0, true);

  const button = { $: new Button(device.addEvent(new ButtonEvent(0))) };

  const result = {
    ...hello(device),
    ...online(device),
    button,
    relay,
  };

  metadataStore.set(result, {
    name: 'obi-plug',
  });

  return result;
};
