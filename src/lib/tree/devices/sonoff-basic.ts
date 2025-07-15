/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Indicator } from '../../services/indicator.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import { output } from '../properties/actuators.js';
import { button } from '../properties/sensors.js';

export const sonoffBasic = <T extends string>(
  topic: T,
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline = context.connect,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  const indicator = device.addService(new Indicator(0));

  return {
    $noMainReference: true as const,
    button: button(context, device, 0),
    device: ipDevice(context, device, false, indicator, initiallyOnline),
    indicator,
    relay: output(context, device, 0, topic, indicator),
  };
};
