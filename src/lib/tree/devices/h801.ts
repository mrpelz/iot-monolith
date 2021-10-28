/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../main.js';
import { Timings, hello, online } from '../properties/sensors.js';
import { Logger } from '../../log.js';
import { UDPDevice } from '../../device/udp.js';
import { led } from '../properties/actuators.js';

export const h801 = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);
  const ledR = led(device, 0, true);
  const ledG = led(device, 1);
  const ledB = led(device, 2);
  const ledW1 = led(device, 3);
  const ledW2 = led(device, 4);

  const result = {
    ...hello(device, timings.moderate || timings.default),
    ...online(device),
    ledB,
    ledG,
    ledR,
    ledW1,
    ledW2,
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
  });

  return result;
};
