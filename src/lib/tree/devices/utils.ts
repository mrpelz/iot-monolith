/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Timings,
  hello,
  lastSeen,
  online,
  vcc,
} from '../properties/sensors.js';
import { Device } from '../../device/main.js';
import { ESPNowDevice } from '../../device/esp-now.js';
import { Levels } from '../main.js';
import { TCPDevice } from '../../device/tcp.js';
import { TCPTransport } from '../../transport/tcp.js';
import { UDPDevice } from '../../device/udp.js';
import { UDPTransport } from '../../transport/udp.js';
import { resetDevice } from '../properties/actuators.js';

export const defaultsEspNow = (device: ESPNowDevice) => ({
  ...lastSeen(device.seen),
  ...vcc(device),
});

export const defaultsIpDevice = (
  device: UDPDevice | TCPDevice,
  timings: Timings
) => ({
  ...hello(device, timings.moderate || timings.default),
  ...online(device),
  ...resetDevice(device),
});

export const deviceMeta = (device: Device) => ({
  host:
    device.transport instanceof TCPTransport ||
    device.transport instanceof UDPTransport
      ? device.transport.host
      : undefined,
  identifier: device.identifier ? [...device.identifier] : undefined,
  level: Levels.DEVICE as const,
  port:
    device.transport instanceof TCPTransport ||
    device.transport instanceof UDPTransport
      ? device.transport.port
      : undefined,
  transportType: device.transport.constructor.name,
  type: device.constructor.name,
});
