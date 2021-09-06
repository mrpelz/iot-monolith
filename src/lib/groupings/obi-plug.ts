/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Levels, metadataStore } from '../tree.js';
import { Timings, hello, online } from './metrics.js';
import { Button } from '../items/button.js';
import { Button as ButtonEvent } from '../events/button.js';
import { Logger } from '../log.js';
import { UDPDevice } from '../device/udp.js';
import { output } from './actuators.js';

export const obiPlug = (
  logger: Logger,
  timings: Timings,
  host: string,
  port = 1337
) => {
  const device = new UDPDevice(logger, host, port);
  const relay = output(device, 0, true);

  const button = { $: new Button(device.addEvent(new ButtonEvent(0))) };

  const result = {
    ...hello(device, timings.moderate || timings.default),
    ...online(device),
    button,
    relay,
  };

  metadataStore.set(result, {
    level: Levels.DEVICE,
    name: 'obiPlug',
  });

  return result;
};
