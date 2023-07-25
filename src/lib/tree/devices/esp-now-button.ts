/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice, MACAddress } from '../../device/esp-now.js';
import { Device } from '../../device/main.js';
import { UDPDevice } from '../../device/udp.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { espNowDevice, ipDevice } from '../elements/device.js';
import { Element, Level } from '../main.js';
import { button, Timings } from '../properties/sensors.js';

export type EspNowButtonOptions = {
  espNow: {
    macAddress: MACAddress;
    transport: ESPNowTransport;
  };
  wifi: {
    host: string;
    initiallyOnline?: boolean;
    port?: number;
  };
};

export const espNowButton = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  options: EspNowButtonOptions,
) => {
  const children = (device: Device) => ({
    button0: button(device, 0),
    button1: button(device, 1),
  });

  const espNow = (() => {
    const { macAddress, transport } = options.espNow;
    const device = new ESPNowDevice(logger, transport, macAddress);

    return {
      espNow: new Element({
        ...children(device),
        ...espNowDevice(device),
        isSubDevice: true,
      }),
    };
  })();

  const wifi = (() => {
    const { host, initiallyOnline, port = 1337 } = options.wifi;
    const device = new UDPDevice(logger, host, port);

    return {
      wifi: new Element({
        ...children(device),
        ...ipDevice(device, persistence, timings, undefined, initiallyOnline),
        isSubDevice: true,
      }),
    };
  })();

  return new Element({
    ...espNow,
    ...wifi,
    level: Level.DEVICE as const,
  });
};
