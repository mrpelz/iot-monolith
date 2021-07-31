import { hello, online } from './metrics.js';
import { UDPDevice } from '../device/udp.js';
import { led } from './actuators.js';
import { metadataStore } from '../hierarchy.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const h801 = (host: string, port = 1337) => {
  const device = new UDPDevice(host, port);
  const led0 = led(device, 0, true);
  const led1 = led(device, 1);
  const led2 = led(device, 2);
  const led3 = led(device, 3);
  const led4 = led(device, 4);

  const result = {
    ...hello(device),
    ...online(device),
    led0,
    led1,
    led2,
    led3,
    led4,
  };

  metadataStore.set(result, {
    name: 'h801',
  });

  return result;
};
