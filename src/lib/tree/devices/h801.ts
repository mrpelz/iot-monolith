/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { defaultsIpDevice, deviceMeta } from './utils.js';
import { Indicator } from '../../services/indicator.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { Timings } from '../properties/sensors.js';
import { UDPDevice } from '../../device/udp.js';
import { addMeta } from '../main.js';
import { led } from '../properties/actuators.js';

export const h801 = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);

  const indicator = device.addService(new Indicator(0));

  const ledR = led(device, 0, indicator, persistence);
  const ledG = led(device, 1, undefined, persistence);
  const ledB = led(device, 2, undefined, persistence);
  const ledW1 = led(device, 3, undefined, persistence);
  const ledW2 = led(device, 4, undefined, persistence);

  return addMeta(
    {
      ...defaultsIpDevice(device, persistence, timings, indicator),
      indicator: {
        $: indicator,
      },
      ledB,
      ledG,
      ledR,
      ledW1,
      ledW2,
    },
    {
      ...deviceMeta(device),
    }
  );
};
