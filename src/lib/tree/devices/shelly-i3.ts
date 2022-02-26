/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../main.js';
import {
  Timings,
  button,
  hello,
  lastSeen,
  online,
} from '../properties/sensors.js';
import { Logger } from '../../log.js';
import { UDPDevice } from '../../device/udp.js';

export const shellyi3 = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);

  const result = {
    ...hello(device, timings.moderate || timings.default),
    ...lastSeen(device.seen),
    ...online(device),
    button0: button(device, 0),
    button1: button(device, 1),
    button2: button(device, 2),
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
  });

  return result;
};
