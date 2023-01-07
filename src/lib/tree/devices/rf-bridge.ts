/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Timings, rfReadout } from '../properties/sensors.js';
import { defaultsIpDevice, deviceMeta } from './utils.js';
import { ESPNow } from '../../events/esp-now.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { Rf433 } from '../../events/rf433.js';
import { UDPDevice } from '../../device/udp.js';
import { addMeta } from '../main.js';

export const rfBridge = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  host: string,
  port = 1337,
  initiallyOnline?: boolean
) => {
  const device = new UDPDevice(logger, host, port);

  const espNowEvent = device.addEvent(new ESPNow());
  const rf433Event = device.addEvent(new Rf433());

  const children = {
    espNowTransport: {
      $: new ESPNowTransport(logger, espNowEvent),
    },
    ev1527Transport: {
      $: new Ev1527Transport(logger, rf433Event),
    },
  };

  return addMeta(
    {
      ...children,
      ...defaultsIpDevice(
        device,
        persistence,
        timings,
        undefined,
        initiallyOnline
      ),
      ...rfReadout(espNowEvent, rf433Event),
    },
    {
      ...deviceMeta(device),
    }
  );
};
