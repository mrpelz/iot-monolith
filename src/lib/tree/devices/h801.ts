/* eslint-disable @typescript-eslint/explicit-module-boundary-types,sort-keys */

import { UDPDevice } from '../../device/udp.js';
import { Indicator } from '../../services/indicator.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { led } from '../properties/actuators.js';

export const h801 = (
  host: string,
  { logger, persistence, timings }: Context,
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
    indicator,
    internal: {
      ledR: led(device, 0, indicator, persistence),
      ledG: led(device, 1, undefined, persistence),
      ledB: led(device, 2, undefined, persistence),
      ledW1: led(device, 3, undefined, persistence),
      ledW2: led(device, 4, undefined, persistence),
    },
  };
};
