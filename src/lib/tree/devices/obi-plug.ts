/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Timings, button } from '../properties/sensors.js';
import { Element } from '../main.js';
import { Indicator } from '../../services/indicator.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { UDPDevice } from '../../device/udp.js';
import { ipDevice } from '../elements/device.js';
import { output } from '../properties/actuators.js';

export const obiPlug = <T extends string>(
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  topic: T,
  host: string,
  port = 1337,
  initiallyOnline?: boolean
) => {
  const device = new UDPDevice(logger, host, port);

  const indicator = device.addService(new Indicator(0));

  return new Element({
    ...ipDevice(device, persistence, timings, indicator, initiallyOnline),
    button: button(device, 0),
    indicator,
    internal: {
      relay: output(device, 0, topic, indicator, persistence),
    },
  });
};
