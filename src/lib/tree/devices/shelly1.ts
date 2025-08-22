/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { Level } from '../main.js';
import { output } from '../properties/actuators.js';
import { button } from '../properties/sensors.js';

export const shelly1 = <T extends string>(
  topic: T,
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline = context.connect,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  return {
    $noMainReference: true as const,
    button: button(context, device, 0),
    device: ipDevice(context, device, false, undefined, initiallyOnline),
    level: Level.DEVICE as const,
    relay: output(context, device, 0, topic, undefined),
  };
};
