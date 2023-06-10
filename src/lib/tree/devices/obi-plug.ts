/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Timings, button } from '../properties/sensors.js';
import { Indicator } from '../../services/indicator.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { UDPDevice } from '../../device/udp.js';
import { element } from '../main-ng.js';
import { ipDevice } from '../elements/device.js';
import { output } from '../properties/actuators.js';

export const obiPlug = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  topic: string,
  host: string,
  port = 1337,
  initiallyOnline?: boolean
) => {
  const device = new UDPDevice(logger, host, port);

  const indicator = device.addService(new Indicator(0));

  return element({
    ...ipDevice(device, persistence, timings, indicator, initiallyOnline),
    button: button(device, 0),
    indicator,
    relay: output(device, 0, topic, indicator, persistence),
  });
};
