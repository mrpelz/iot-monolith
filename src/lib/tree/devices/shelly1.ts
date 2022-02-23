/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../main.js';
import { Timings, hello, lastSeen, online } from '../properties/sensors.js';
import { Button } from '../../items/button.js';
import { Button as ButtonEvent } from '../../events/button.js';
import { Logger } from '../../log.js';
import { UDPDevice } from '../../device/udp.js';
import { output } from '../properties/actuators.js';

export const shelly1 = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);
  const relay = output(device, 0);

  const button = { $: new Button(device.addEvent(new ButtonEvent(0))) };

  const result = {
    ...hello(device, timings.moderate || timings.default),
    ...lastSeen(device.seen),
    ...online(device),
    button,
    relay,
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
  });

  return result;
};
