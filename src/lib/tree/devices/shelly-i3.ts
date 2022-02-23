/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../main.js';
import { Timings, hello, lastSeen, online } from '../properties/sensors.js';
import { Button } from '../../items/button.js';
import { Button as ButtonEvent } from '../../events/button.js';
import { Logger } from '../../log.js';
import { UDPDevice } from '../../device/udp.js';

export const shellyi3 = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);

  const children = {
    button0: { $: new Button(device.addEvent(new ButtonEvent(0))) },
    button1: { $: new Button(device.addEvent(new ButtonEvent(1))) },
    button2: { $: new Button(device.addEvent(new ButtonEvent(2))) },
  };

  const result = {
    ...children,
    ...hello(device, timings.moderate || timings.default),
    ...lastSeen(device.seen),
    ...online(device),
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
  });

  return result;
};
