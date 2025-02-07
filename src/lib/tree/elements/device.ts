/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice } from '../../device/esp-now.js';
import { Ev1527Device } from '../../device/ev1527.js';
import { Device } from '../../device/main.js';
import { TCPDevice } from '../../device/tcp.js';
import { UDPDevice } from '../../device/udp.js';
import { Persistence } from '../../persistence.js';
import { Indicator } from '../../services/indicator.js';
import { Level } from '../main.js';
import {
  identifyDevice,
  online,
  resetDevice,
} from '../properties/actuators.js';
import { hello, lastSeen, Timings, vcc } from '../properties/sensors.js';

const deviceMeta = <S extends boolean>(device: Device, isSubDevice: S) => ({
  ...(device.identifier ? { identifier: [...device.identifier.values()] } : {}),
  isSubDevice,
  level: Level.DEVICE as const,
  transportType: device.transport.constructor.name,
  type: device.constructor.name,
});

export const espNowDevice = <S extends boolean>(
  device: ESPNowDevice,
  isSubDevice: S,
) => ({
  $: 'espNowDevice' as const,
  ...deviceMeta(device, isSubDevice),
  ...lastSeen(device.seen),
  ...vcc(device),
});

export const ev1527Device = (device: Ev1527Device) => ({
  $: 'ev1527Device' as const,
  ...deviceMeta(device, false),
  ...lastSeen(device.seen),
});

export const ipDevice = <S extends boolean>(
  device: TCPDevice | UDPDevice,
  isSubDevice: S,
  persistence: Persistence,
  timings: Timings,
  indicator?: Indicator,
  initiallyOnline = false,
) => ({
  $: 'ipDevice' as const,
  ...(indicator ? identifyDevice(indicator) : {}),
  ...deviceMeta(device, isSubDevice),
  ...hello(device, timings.moderate || timings.default),
  ...online(device, persistence, initiallyOnline),
  ...resetDevice(device),
  host: device.transport.host,
  port: device.transport.port,
});

export const deviceMap = <T extends object>(devices: T) => ({
  devices: {
    $: 'deviceMap' as const,
    ...devices,
    level: Level.NONE as const,
  },
});
