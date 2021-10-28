/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../main.js';
import { Timings, hello, online, rfReadout } from '../properties/sensors.js';
import { ESPNow } from '../../events/esp-now.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Logger } from '../../log.js';
import { Rf433 } from '../../events/rf433.js';
import { UDPDevice } from '../../device/udp.js';

export const rfBridge = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
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

  const result = {
    ...children,
    ...hello(device, timings.moderate || timings.default),
    ...online(device),
    ...rfReadout(espNowEvent, rf433Event),
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
    name: 'rfBridge',
  });

  return result;
};
