/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { defaultsIpDevice, deviceMeta } from './utils.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { Timings } from '../properties/sensors.js';
import { UDPDevice } from '../../device/udp.js';
import { led } from '../properties/actuators.js';
import { metadataStore } from '../main.js';

export const h801 = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);
  const ledR = led(device, 0, true, persistence);
  const ledG = led(device, 1, undefined, persistence);
  const ledB = led(device, 2, undefined, persistence);
  const ledW1 = led(device, 3, undefined, persistence);
  const ledW2 = led(device, 4, undefined, persistence);

  const result = {
    ...defaultsIpDevice(device, timings),
    ledB,
    ledG,
    ledR,
    ledW1,
    ledW2,
  };

  metadataStore.set(result, {
    ...deviceMeta(device),
  });

  return result;
};
