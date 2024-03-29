/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice, MACAddress } from '../../device/esp-now.js';
import { Levels, addMeta } from '../main.js';
import { Timings, button } from '../properties/sensors.js';
import { defaultsEspNow, defaultsIpDevice, deviceMeta } from './util.js';
import { Device } from '../../device/main.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { UDPDevice } from '../../device/udp.js';

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
  options: EspNowButtonOptions
) => {
  const children = (device: Device) => ({
    button0: button(device, 0),
    button1: button(device, 1),
  });

  const espNow = (() => {
    const { macAddress, transport } = options.espNow;
    const device = new ESPNowDevice(logger, transport, macAddress);

    return {
      espNow: addMeta(
        {
          ...children(device),
          ...defaultsEspNow(device),
        },
        {
          isSubDevice: true,
          ...deviceMeta(device),
        }
      ),
    };
  })();

  const wifi = (() => {
    const { host, initiallyOnline, port = 1337 } = options.wifi;
    const device = new UDPDevice(logger, host, port);

    return {
      wifi: addMeta(
        {
          ...children(device),
          ...defaultsIpDevice(
            device,
            persistence,
            timings,
            undefined,
            initiallyOnline
          ),
        },
        {
          isSubDevice: true,
          ...deviceMeta(device),
        }
      ),
    };
  })();

  return (() =>
    addMeta(
      {
        ...espNow,
        ...wifi,
      },
      {
        level: Levels.DEVICE,
      }
    ))();
};
