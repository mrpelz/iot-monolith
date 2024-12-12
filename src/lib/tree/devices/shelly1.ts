/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { ipDevice } from '../elements/device.js';
import { output } from '../properties/actuators.js';
import { button, Timings } from '../properties/sensors.js';

export const shelly1 = <T extends string>(
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  topic: T,
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
    button: button(device, 0),
    internal: {
      relay: output(device, 0, topic, undefined, persistence),
    },
  };
};
