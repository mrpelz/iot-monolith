/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Timings, hello, online } from './metrics.js';
import { Logger } from '../log.js';
import { UDPDevice } from '../device/udp.js';
import { led } from './actuators.js';
import { metadataStore } from '../tree.js';

export const h801 = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);
  const led0 = led(device, 0, true);
  const led1 = led(device, 1);
  const led2 = led(device, 2);
  const led3 = led(device, 3);
  const led4 = led(device, 4);

  const result = {
    ...hello(device, timings.moderate || timings.default),
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