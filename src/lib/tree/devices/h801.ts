/* eslint-disable @typescript-eslint/explicit-module-boundary-types,sort-keys */

import { UDPDevice } from '../../device/udp.js';
import { Indicator } from '../../services/indicator.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { led, outputNgDimmable } from '../properties/actuators.js';

export const h801 = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  const indicator = device.addService(new Indicator(0));

  return {
    $noMainReference: true as const,
    device: ipDevice(context, device, false, indicator, initiallyOnline),
    indicator,
    ledR: led(context, device, 0, indicator),
    ledG: led(context, device, 1, undefined),
    ledB: led(context, device, 2, undefined),
    ledW1: led(context, device, 3, undefined),
    ledW2: led(context, device, 4, undefined),
  };
};

export const h801Ng = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  const indicatorR = outputNgDimmable(context, device, 0);

  return {
    $noMainReference: true as const,
    device: ipDevice(context, device, false, indicatorR.state, initiallyOnline),
    indicatorR,
    indicatorG: outputNgDimmable(context, device, 1, indicatorR.state),
    ledR: outputNgDimmable(context, device, 2, indicatorR.state),
    ledG: outputNgDimmable(context, device, 3, indicatorR.state),
    ledB: outputNgDimmable(context, device, 4, indicatorR.state),
    ledW1: outputNgDimmable(context, device, 5, indicatorR.state),
    ledW2: outputNgDimmable(context, device, 6, indicatorR.state),
  };
};
