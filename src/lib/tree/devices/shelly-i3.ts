/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Timings, button } from '../properties/sensors.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { UDPDevice } from '../../device/udp.js';
import { element } from '../main.js';
import { ipDevice } from '../elements/device.js';

export const shellyi3 = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  host: string,
  port = 1337,
  initiallyOnline?: boolean
) => {
  const device = new UDPDevice(logger, host, port);

  return element({
    ...ipDevice(device, persistence, timings, undefined, initiallyOnline),
    button0: button(device, 0),
    button1: button(device, 1),
    button2: button(device, 2),
  });
};
