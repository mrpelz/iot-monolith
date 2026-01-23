/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { input } from '../properties/sensors.js';

export const motionSensor = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline = context.connect,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  return {
    $: 'motionSensor' as const,
    $noMainReference: true as const,
    device: ipDevice(context, device, false, undefined, initiallyOnline),
    motion: input(context, device, undefined, 'security'),
  };
};
