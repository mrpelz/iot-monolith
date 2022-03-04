/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../main.js';
import { Timings, button } from '../properties/sensors.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { UDPDevice } from '../../device/udp.js';
import { defaultsIpDevice } from './utils.js';
import { output } from '../properties/actuators.js';

export const obiPlug = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);
  const relay = output(device, 0, true, undefined, persistence);

  const result = {
    ...defaultsIpDevice(device, timings),
    button: button(device, 0),
    relay,
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
  });

  return result;
};
