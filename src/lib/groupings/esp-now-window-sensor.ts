import { ESPNowDevice, MACAddress } from '../device/esp-now.js';
import { hello, online, vcc } from './metrics.js';
import { Device } from '../device/main.js';
import { ESPNowTransport } from '../transport/esp-now.js';
import { Input } from '../events/input.js';
import { Meta } from '../hierarchy.js';
import { SingleValueEvent } from '../items/event.js';
import { UDPDevice } from '../device/udp.js';

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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const espNowWindowSensor = (options: EspNowWindowSensorOptions) => {
  const children = (device: Device) => ({
    input0: new SingleValueEvent(device.addEvent(new Input(0))).state,
    input1: new SingleValueEvent(device.addEvent(new Input(1))).state,
    input2: new SingleValueEvent(device.addEvent(new Input(2))).state,
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
      name: 'esp-now-window-sensor',
    },
    nodes: {
      ...espNow,
      ...wifi,
    },
  };
};
