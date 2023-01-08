/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Timings, button } from '../properties/sensors.js';
import { defaultsIpDevice, deviceMeta } from './util.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { UDPDevice } from '../../device/udp.js';
import { addMeta } from '../main.js';
import { output } from '../properties/actuators.js';

export const shelly1 = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  actuated: string,
  host: string,
  port = 1337,
  initiallyOnline?: boolean
) => {
  const device = new UDPDevice(logger, host, port);
  const relay = output(device, 0, actuated, undefined, persistence);

  return addMeta(
    {
      ...defaultsIpDevice(
        device,
        persistence,
        timings,
        undefined,
        initiallyOnline
      ),
      button: button(device, 0),
      relay,
    },
    {
      ...deviceMeta(device),
    }
  );
};
