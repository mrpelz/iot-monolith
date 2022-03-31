/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice, MACAddress } from '../../device/esp-now.js';
import { Levels, ValueType, metadataStore } from '../main.js';
import { defaultsEspNow, defaultsIpDevice, deviceMeta } from './utils.js';
import { Device } from '../../device/main.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { Input } from '../../events/input.js';
import { Logger } from '../../log.js';
import { SingleValueEvent } from '../../items/event.js';
import { Timings } from '../properties/sensors.js';
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

const children = (device: Device) => {
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
};

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
      ...defaultsEspNow(device),
    };

    metadataStore.set(result, {
      isSubDevice: true,
      ...deviceMeta(device),
    });

    return { espNow: result };
  })();

  const wifi = (() => {
    const { host, port = 1337 } = options.wifi;
    const device = new UDPDevice(logger, host, port);

    const result = {
      ...children(device),
      ...defaultsIpDevice(device, timings),
    };

    metadataStore.set(result, {
      isSubDevice: true,
      ...deviceMeta(device),
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
