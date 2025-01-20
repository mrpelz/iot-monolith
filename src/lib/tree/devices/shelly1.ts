/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { output } from '../properties/actuators.js';
import { button } from '../properties/sensors.js';

export const shelly1 = <T extends string>(
  topic: T,
  host: string,
  { connect, logger, persistence, timings }: Context,
  port = 1337,
  initiallyOnline = connect,
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
