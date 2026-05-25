/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { UDPDevice } from '../../device/udp.js';
import { OutputBuzzer } from '../../services/output-ng-buzzer.js';
import { OutputDimmable } from '../../services/output-ng-dimmable.js';
import { OutputDimmableRGB } from '../../services/output-ng-dimmable-rgb.js';
import { Context } from '../context.js';
import { ipDevice } from '../elements/device.js';

export const esp32s3zero = (
  host: string,
  context: Context,
  port = 1337,
  initiallyOnline?: boolean,
) => {
  const { logger } = context;

  const device = new UDPDevice(logger, host, port);

  const output0 = device.addService(new OutputDimmable(0));
  const output1 = device.addService(new OutputDimmableRGB(0));
  const output2 = device.addService(new OutputDimmableRGB(1));
  const output3 = device.addService(new OutputBuzzer(0));

  return {
    $noMainReference: true as const,
    device: ipDevice(context, device, false, undefined, initiallyOnline),
    output0,
    output1,
    output2,
    output3,
  };
};
