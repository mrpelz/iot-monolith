/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';
import {
  outputNgBuzzer,
  outputNgDimmable,
  outputNgDimmableRGB,
} from '../properties/actuators.js';

export const esp32s3zero = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  const indicatorRGB0 = outputNgDimmableRGB(context, device, 0, 'indicator');

  return {
    $noMainReference: true as const,
    buzzer0: outputNgBuzzer(
      context,
      device,
      0,
      'indicator',
      indicatorRGB0.state,
    ),
    device: ipDevice(
      context,
      device,
      false,
      indicatorRGB0.state,
      initiallyOnline,
    ),
    indicatorRGB0,
    led0: outputNgDimmable(context, device, 0, 'lighting', indicatorRGB0.state),
    ledRGB1: outputNgDimmableRGB(
      context,
      device,
      1,
      'lighting',
      indicatorRGB0.state,
    ),
  };
};
