/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { button } from '../properties/sensors.js';

export const shellyi3 = (
  host: string,
  { connect, logger, persistence, timings }: Context,
  port = 1337,
  initiallyOnline = connect,
) => {
  const device = new UDPDevice(logger, host, port);

  return {
    button0: button(device, 0),
    button1: button(device, 1),
    button2: button(device, 2),
    ...ipDevice(
      device,
      false,
      persistence,
      timings,
      undefined,
      initiallyOnline,
    ),
  };
};
