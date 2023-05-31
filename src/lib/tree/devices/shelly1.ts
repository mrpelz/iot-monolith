/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Timings, button } from '../properties/sensors.js';
import { Element } from '../main-ng.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { UDPDevice } from '../../device/udp.js';
import { ipDevice } from '../elements/device.js';
import { output } from '../properties/actuators.js';

export const shelly1 = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  topic: string,
  host: string,
  port = 1337,
  initiallyOnline?: boolean
) => {
  const device = new UDPDevice(logger, host, port);

  return new Element({
    ...ipDevice(device, persistence, timings, undefined, initiallyOnline),
    button: button(device, 0),
    relay: output(device, 0, topic, undefined, persistence),
  });
};
