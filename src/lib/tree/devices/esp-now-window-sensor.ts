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

const children = (context: Context, device: Device) => ({
  $noMainReference: true as const,
  input0: input(context, device, 0, 'input0'),
  input1: input(context, device, 1, 'input1'),
  input2: input(context, device, 2, 'input2'),
  lol: true as const,
});

export const espNowWindowSensor = (
  options: EspNowWindowSensorOptions,
  context: Context,
) => {
  const { connect, logger } = context;

  const espNow = (() => {
    const { macAddress, transport } = options.espNow;
    const device = new ESPNowDevice(logger, transport, macAddress);

    return {
      espNow: {
        ...children(context, device),
        device: espNowDevice(context, device, true),
      },
    };
  })();

  const wifi = (() => {
    const { host, initiallyOnline = connect, port = 1337 } = options.wifi;
    const device = new UDPDevice(logger, host, port);

    return {
      wifi: {
        ...children(context, device),
        device: ipDevice(context, device, true, undefined, initiallyOnline),
      },
    };
  })();

  return {
    $: 'espNowWindowSensor' as const,
    device: {
      isSubDevice: false,
      level: Level.DEVICE as const,
      ...espNow,
      ...wifi,
    },
  };
};
