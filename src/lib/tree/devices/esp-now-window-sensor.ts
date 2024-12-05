/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice, MACAddress } from '../../device/esp-now.js';
import { Device } from '../../device/main.js';
import { UDPDevice } from '../../device/udp.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { espNowDevice, ipDevice } from '../elements/device.js';
import { Level } from '../main.js';
import { input, Timings } from '../properties/sensors.js';

export type EspNowWindowSensorOptions = {
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

const children = (device: Device) => ({
  internal: {
    input0: input(device, 0, 'input0'),
    input1: input(device, 1, 'input1'),
    input2: input(device, 2, 'input2'),
    lol: true as const,
  },
});

export const espNowWindowSensor = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  options: EspNowWindowSensorOptions,
) => {
  const espNow = (() => {
    const { macAddress, transport } = options.espNow;
    const device = new ESPNowDevice(logger, transport, macAddress);

    return {
      espNow: {
        ...children(device),
        ...espNowDevice(device),
        isSubDevice: true,
      },
    };
  })();

  const wifi = (() => {
    const { host, initiallyOnline, port = 1337 } = options.wifi;
    const device = new UDPDevice(logger, host, port);

    return {
      wifi: {
        ...children(device),
        ...ipDevice(device, persistence, timings, undefined, initiallyOnline),
        isSubDevice: true,
      },
    };
  })();

  return {
    $: 'espNowWindowSensor' as const,
    ...espNow,
    ...wifi,
    level: Level.DEVICE as const,
  };
};
