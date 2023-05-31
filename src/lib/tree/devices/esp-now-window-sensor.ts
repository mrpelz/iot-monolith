/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice, MACAddress } from '../../device/esp-now.js';
import { Element, Level, symbolLevel } from '../main-ng.js';
import { Timings, input } from '../properties/sensors.js';
import { espNowDevice, ipDevice } from '../elements/device.js';
import { Device } from '../../device/main.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { Logger } from '../../log.js';
import { Persistence } from '../../persistence.js';
import { UDPDevice } from '../../device/udp.js';

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
  input0: input(device, 0, 'input0'),
  input1: input(device, 1, 'input1'),
  input2: input(device, 2, 'input2'),
});

export const espNowWindowSensor = (
  logger: Logger,
  persistence: Persistence,
  timings: Timings,
  options: EspNowWindowSensorOptions
) => {
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
    [symbolLevel]: Level.DEVICE,
  });
};
