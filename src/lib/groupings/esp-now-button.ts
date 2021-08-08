/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice, MACAddress } from '../device/esp-now.js';
import { Timings, hello, online, vcc } from './metrics.js';
import { Button } from '../items/button.js';
import { Button as ButtonEvent } from '../events/button.js';
import { Device } from '../device/main.js';
import { ESPNowTransport } from '../transport/esp-now.js';
import { Logger } from '../log.js';
import { UDPDevice } from '../device/udp.js';
import { metadataStore } from '../tree.js';

export type EspNowButtonOptions = {
  espNow: {
    macAddress: MACAddress;
    transport: ESPNowTransport;
  };
  wifi: {
    host: string;
    port?: number;
  };
};

export const espNowButton = (
  logger: Logger,
  timings: Timings,
  options: EspNowButtonOptions
) => {
  const children = (device: Device) => ({
    button0: { $: new Button(device.addEvent(new ButtonEvent(0))) },
    button1: { $: new Button(device.addEvent(new ButtonEvent(1))) },
  });

  const espNow = (() => {
    const { macAddress, transport } = options.espNow;
    const device = new ESPNowDevice(logger, transport, macAddress);

    const result = {
      ...children,
      ...vcc(device),
    };

    metadataStore.set(result, {
      name: 'esp-now',
    });

    return { espNow: result };
  })();

  const wifi = (() => {
    const { host, port = 1337 } = options.wifi;
    const device = new UDPDevice(logger, host, port);

    const result = {
      ...children,
      ...hello(device, timings.moderate || timings.default),
      ...online(device),
    };

    metadataStore.set(result, {
      name: 'wifi',
    });

    return { wifi: result };
  })();

  return (() => {
    const result = {
      ...espNow,
      ...wifi,
    };

    metadataStore.set(result, {
      name: 'esp-now-button',
    });

    return result;
  })();
};
