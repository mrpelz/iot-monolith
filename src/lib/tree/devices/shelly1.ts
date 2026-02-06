/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { output } from '../properties/actuators.js';
import { button, input } from '../properties/sensors.js';

export const shelly1 = <T extends string>(
  topic: T,
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  return {
    $noMainReference: true as const,
    button: button(context, device, 0),
    device: ipDevice(context, device, false, undefined, initiallyOnline),
    relay: output(context, device, 0, topic, undefined),
  };
};

export const shelly1WithInput = <T extends string>(
  topic: T,
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  return {
    $noMainReference: true as const,
    button: button(context, device, 0),
    device: ipDevice(context, device, false, undefined, initiallyOnline),
    input: input(context, device, 0, undefined),
    relay: output(context, device, 0, topic, undefined),
  };
};
