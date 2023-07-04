/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Timings,
  hello,
  lastSeen,
  online,
  vcc,
} from '../properties/sensors.js';
import {
  identifyDevice,
  resetDevice,
  setOnline,
} from '../properties/actuators.js';
import { Device } from '../../device/main.js';
import { ESPNowDevice } from '../../device/esp-now.js';
import { Ev1527Device } from '../../device/ev1527.js';
import { Indicator } from '../../services/indicator.js';
import { Level } from '../main.js';
import { Persistence } from '../../persistence.js';
import { TCPDevice } from '../../device/tcp.js';
import { UDPDevice } from '../../device/udp.js';

const deviceMeta = (device: Device) => ({
  identifier: device.identifier ? [...device.identifier] : undefined,
  level: Level.DEVICE as const,
  transportType: device.transport.constructor.name,
  type: device.constructor.name,
});

export const espNowDevice = (device: ESPNowDevice) => ({
  $: 'espNowDevice' as const,
  ...deviceMeta(device),
  ...lastSeen(device.seen),
  ...vcc(device),
});

export const ev1527Device = (device: Ev1527Device) => ({
  $: 'ev1527Device' as const,
  ...deviceMeta(device),
  ...lastSeen(device.seen),
});

export const ipDevice = (
  device: TCPDevice | UDPDevice,
  persistence: Persistence,
  timings: Timings,
  indicator?: Indicator,
  initiallyOnline = false
) => ({
  $: 'ipDevice' as const,
  ...deviceMeta(device),
  ...hello(device, timings.moderate || timings.default),
  ...online(device),
  ...setOnline(device, persistence, initiallyOnline),
  ...resetDevice(device),
  ...(indicator ? identifyDevice(indicator) : {}),
  host: device.transport.host,
  port: device.transport.port,
});
