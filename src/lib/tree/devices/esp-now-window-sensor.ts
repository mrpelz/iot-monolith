/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice, MACAddress } from '../../device/esp-now.js';
import { Device } from '../../device/main.js';
import { UDPDevice } from '../../device/udp.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { Context } from '../context.js';
import { espNowDevice, ipDevice } from '../elements/device.js';
import { Level } from '../main.js';
import { input } from '../properties/sensors.js';

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
    $noMainReference: true as const,
    input0: input(device, 0, 'input0'),
    input1: input(device, 1, 'input1'),
    input2: input(device, 2, 'input2'),
    lol: true as const,
  },
});

export const espNowWindowSensor = (
  options: EspNowWindowSensorOptions,
  { connect, logger, persistence, timings }: Context,
) => {
  const espNow = (() => {
    const { macAddress, transport } = options.espNow;
    const device = new ESPNowDevice(logger, transport, macAddress);

    return {
      espNow: {
        ...children(device),
        ...espNowDevice(device, true),
      },
    };
  })();

  const wifi = (() => {
    const { host, initiallyOnline = connect, port = 1337 } = options.wifi;
    const device = new UDPDevice(logger, host, port);

    return {
      wifi: {
        ...children(device),
        ...ipDevice(
          device,
          true,
          persistence,
          timings,
          undefined,
          initiallyOnline,
        ),
      },
    };
  })();

  return {
    $: 'espNowWindowSensor' as const,
    isSubDevice: false as const,
    level: Level.DEVICE as const,
    ...espNow,
    ...wifi,
  };
};
