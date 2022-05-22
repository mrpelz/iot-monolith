/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice, MACAddress } from '../../device/esp-now.js';
import { Levels, ValueType, addMeta } from '../main.js';
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

const children = (device: Device) => ({
  input0: (() =>
    addMeta(
      { _get: new SingleValueEvent(device.addEvent(new Input(0))).state },
      {
        level: Levels.PROPERTY,
        measured: 'open',
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      }
    ))(),
  input1: (() =>
    addMeta(
      { _get: new SingleValueEvent(device.addEvent(new Input(1))).state },
      {
        level: Levels.PROPERTY,
        measured: 'open',
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      }
    ))(),
  input2: (() =>
    addMeta(
      { _get: new SingleValueEvent(device.addEvent(new Input(2))).state },
      {
        level: Levels.PROPERTY,
        measured: 'open',
        type: 'sensor',
        valueType: ValueType.BOOLEAN,
      }
    ))(),
});

export const espNowWindowSensor = (
  logger: Logger,
  timings: Timings,
  options: EspNowWindowSensorOptions
) => {
  const espNow = (() => {
    const { macAddress, transport } = options.espNow;
    const device = new ESPNowDevice(logger, transport, macAddress);

    return {
      espNow: addMeta(
        {
          ...children(device),
          ...defaultsEspNow(device),
        },
        {
          isSubDevice: true,
          ...deviceMeta(device),
        }
      ),
    };
  })();

  const wifi = (() => {
    const { host, port = 1337 } = options.wifi;
    const device = new UDPDevice(logger, host, port);

    return {
      wifi: addMeta(
        {
          ...children(device),
          ...defaultsIpDevice(device, timings),
        },
        {
          isSubDevice: true,
          ...deviceMeta(device),
        }
      ),
    };
  })();

  return (() =>
    addMeta(
      {
        ...espNow,
        ...wifi,
      },
      {
        level: Levels.DEVICE,
      }
    ))();
};
