/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice, MACAddress } from '../device/esp-now.js';
import { Timings, hello, online, vcc } from './metrics.js';
import { Device } from '../device/main.js';
import { ESPNowTransport } from '../transport/esp-now.js';
import { Input } from '../events/input.js';
import { Logger } from '../log.js';
import { SingleValueEvent } from '../items/event.js';
import { UDPDevice } from '../device/udp.js';
import { metadataStore } from '../tree.js';

export type EspNowWindowSensorOptions = {
  espNow: {
    macAddress: MACAddress;
    transport: ESPNowTransport;
  };
  wifi: {
    host: string;
    port?: number;
  };
};

export const espNowWindowSensor = (
  logger: Logger,
  timings: Timings,
  options: EspNowWindowSensorOptions
) => {
  const children = (device: Device) => ({
    input0: { $: new SingleValueEvent(device.addEvent(new Input(0))).state },
    input1: { $: new SingleValueEvent(device.addEvent(new Input(1))).state },
    input2: { $: new SingleValueEvent(device.addEvent(new Input(2))).state },
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
      name: 'esp-now-window-sensor',
    });

    return result;
  })();
};
