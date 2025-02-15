/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { button } from '../properties/sensors.js';

export const shellyi3 = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline = context.connect,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  return {
    button0: button(context, device, 0),
    button1: button(context, device, 1),
    button2: button(context, device, 2),
    ...ipDevice(context, device, false, undefined, initiallyOnline),
  };
};
