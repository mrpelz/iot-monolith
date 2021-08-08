/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Timings, hello, online } from './metrics.js';
import { ESPNow } from '../events/esp-now.js';
import { ESPNowTransport } from '../transport/esp-now.js';
import { Ev1527Transport } from '../transport/ev1527.js';
import { Logger } from '../log.js';
import { Rf433 } from '../events/rf433.js';
import { UDPDevice } from '../device/udp.js';
import { metadataStore } from '../tree.js';

export const rfBridge = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);

  const children = {
    espNowTransport: {
      $: new ESPNowTransport(logger, device.addEvent(new ESPNow())),
    },
    ev1527Transport: {
      $: new Ev1527Transport(logger, device.addEvent(new Rf433())),
    },
  };

  const result = {
    ...children,
    ...hello(device, timings.moderate || timings.default),
    ...online(device),
  };

  metadataStore.set(result, {
    name: 'rf-bridge',
  });

  return result;
};
