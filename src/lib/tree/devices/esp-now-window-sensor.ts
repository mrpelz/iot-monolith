/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice, MACAddress } from '../../device/esp-now.js';
import { Levels, ValueType, metadataStore } from '../main.js';
import {
  Timings,
  hello,
  lastSeen,
  online,
  vcc,
} from '../properties/sensors.js';
import { Device } from '../../device/main.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { Input } from '../../events/input.js';
import { Logger } from '../../log.js';
import { SingleValueEvent } from '../../items/event.js';
import { UDPDevice } from '../../device/udp.js';

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

function children(device: Device) {
  return {
    input0: (() => {
      const result = {
        _get: new SingleValueEvent(device.addEvent(new Input(0))).state,
      };

      metadataStore.set(result, {
        level: Levels.PROPERTY,
        measured: 'windowOpen',
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      });

      return result;
    })(),
    input1: (() => {
      const result = {
        _get: new SingleValueEvent(device.addEvent(new Input(1))).state,
      };

      metadataStore.set(result, {
        level: Levels.PROPERTY,
        measured: 'windowOpen',
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      });

      return result;
    })(),
    input2: (() => {
      const result = {
        _get: new SingleValueEvent(device.addEvent(new Input(2))).state,
      };

      metadataStore.set(result, {
        level: Levels.PROPERTY,
        measured: 'windowOpen',
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      });

      return result;
    })(),
  };
}

export const espNowWindowSensor = (
  logger: Logger,
  timings: Timings,
  options: EspNowWindowSensorOptions
) => {
  const espNow = (() => {
    const { macAddress, transport } = options.espNow;
    const device = new ESPNowDevice(logger, transport, macAddress);

    const result = {
      ...children(device),
      ...lastSeen(device.seen),
      ...vcc(device),
    };

    metadataStore.set(result, {
      isSubDevice: true,
      level: Levels.DEVICE,
    });

    return { espNow: result };
  })();

  const wifi = (() => {
    const { host, port = 1337 } = options.wifi;
    const device = new UDPDevice(logger, host, port);

    const result = {
      ...children(device),
      ...hello(device, timings.moderate || timings.default),
      ...lastSeen(device.seen),
      ...online(device),
    };

    metadataStore.set(result, {
      isSubDevice: true,
      level: Levels.DEVICE,
    });

    return { wifi: result };
  })();

  return (() => {
    const result = {
      ...espNow,
      ...wifi,
    };

    metadataStore.set(result, {
      level: Levels.DEVICE,
    });

    return result;
  })();
};
