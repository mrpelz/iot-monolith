/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { ipDevice } from '../elements/device.js';
import { button, Timings } from '../properties/sensors.js';

export const shellyi3 = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  host: string,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const device = new UDPDevice(logger, host, port);

  return {
    ...ipDevice(
      device,
      false,
      persistence,
      timings,
      undefined,
      initiallyOnline,
    ),
    button0: button(device, 0),
    button1: button(device, 1),
    button2: button(device, 2),
  };
};
