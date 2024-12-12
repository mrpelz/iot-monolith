/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { Indicator } from '../../services/indicator.js';
import { ipDevice } from '../elements/device.js';
import { output } from '../properties/actuators.js';
import { button, Timings } from '../properties/sensors.js';

export const obiPlug = <T extends string>(
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  topic: T,
  host: string,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const device = new UDPDevice(logger, host, port);

  const indicator = device.addService(new Indicator(0));

  return {
    ...ipDevice(
      device,
      false,
      persistence,
      timings,
      indicator,
      initiallyOnline,
    ),
    button: button(device, 0),
    indicator,
    internal: {
      relay: output(device, 0, topic, indicator, persistence),
    },
  };
};
