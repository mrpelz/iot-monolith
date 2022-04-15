/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Timings, button } from '../properties/sensors.js';
import { defaultsIpDevice, deviceMeta } from './utils.js';
import { Indicator } from '../../services/indicator.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { UDPDevice } from '../../device/udp.js';
import { metadataStore } from '../main.js';
import { output } from '../properties/actuators.js';

export const sonoffBasic = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  host: string,
  port = 1337,
  actuated?: string
) => {
  const device = new UDPDevice(logger, host, port);

  const indicator = device.addService(new Indicator(0));

  const relay = output(device, 0, indicator, actuated, persistence);

  const result = {
    ...defaultsIpDevice(device, timings, indicator),
    button: button(device, 0),
    indicator: {
      $: indicator,
    },
    relay,
  };

  metadataStore.set(result, {
    ...deviceMeta(device),
  });

  return result;
};
