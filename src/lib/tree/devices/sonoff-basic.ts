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
import { output } from '../properties/actuators.js';

export const sonoffBasic = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);
  const relay = output(device, 0, true);

  const result = {
    ...hello(device, timings.moderate || timings.default),
    ...lastSeen(device.seen),
    ...online(device),
    button: button(device, 0),
    relay,
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
  });

  return result;
};
