/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Timings, button } from '../properties/sensors.js';
import { defaultsIpDevice, deviceMeta } from './utils.js';
import { Logger } from '../../log.js';
import { UDPDevice } from '../../device/udp.js';
import { metadataStore } from '../main.js';

export const shellyi3 = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);

  const result = {
    ...defaultsIpDevice(device, timings),
    button0: button(device, 0),
    button1: button(device, 1),
    button2: button(device, 2),
  };

  metadataStore.set(result, {
    ...deviceMeta(device),
  });

  return result;
};
