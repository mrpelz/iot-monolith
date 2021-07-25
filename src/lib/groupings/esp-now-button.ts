import { ESPNowDevice, MACAddress } from '../device/esp-now.js';
import { hello, online, vcc } from './metrics.js';
import { Button } from '../items/button.js';
import { Button as ButtonEvent } from '../events/button.js';
import { Device } from '../device/main.js';
import { ESPNowTransport } from '../transport/esp-now.js';
import { Meta } from '../hierarchy.js';
import { UDPDevice } from '../device/udp.js';

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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const espNowButton = (options: EspNowButtonOptions) => {
  const children = (device: Device) => ({
    button0: new Button(device.addEvent(new ButtonEvent(0))),
    button1: new Button(device.addEvent(new ButtonEvent(1))),
  });

  const espNow = (() => {
    const { macAddress, transport } = options.espNow;
    const device = new ESPNowDevice(transport, macAddress);

    return {
      espNow: {
        children: children(device),
        meta: <Meta>{
          name: 'esp-now',
        },
        nodes: vcc(device),
      },
    };
  })();

  const wifi = (() => {
    const { host, port = 1337 } = options.wifi;
    const device = new UDPDevice(host, port);

    return {
      wifi: {
        children: children(device),
        meta: <Meta>{
          name: 'wifi',
        },
        nodes: {
          ...hello(device),
          ...online(device),
        },
      },
    };
  })();

  return {
    meta: <Meta>{
      name: 'esp-now-button',
    },
    nodes: {
      ...espNow,
      ...wifi,
    },
  };
};
