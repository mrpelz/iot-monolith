/* eslint-disable @typescript-eslint/explicit-module-boundary-types,sort-keys */

import { UDPDevice } from '../../device/udp.js';
import { Indicator } from '../../services/indicator.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { led } from '../properties/actuators.js';

export const h801 = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline = context.connect,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  const indicator = device.addService(new Indicator(0));

  return {
    indicator,
    internal: {
      $exclude: true as const,
      $noMainReference: true as const,
      ledR: led(context, device, 0, indicator),
      ledG: led(context, device, 1, undefined),
      ledB: led(context, device, 2, undefined),
      ledW1: led(context, device, 3, undefined),
      ledW2: led(context, device, 4, undefined),
    },
    ...ipDevice(context, device, false, indicator, initiallyOnline),
  };
};
