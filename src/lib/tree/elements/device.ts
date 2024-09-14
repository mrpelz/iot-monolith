/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { ESPNowDevice } from '../../device/esp-now.js';
import { Ev1527Device } from '../../device/ev1527.js';
import { Device } from '../../device/main.js';
import { TCPDevice } from '../../device/tcp.js';
import { UDPDevice } from '../../device/udp.js';
import { Persistence } from '../../persistence.js';
import { Indicator } from '../../services/indicator.js';
import { Element, Level } from '../main.js';
import {
  identifyDevice,
  resetDevice,
  setOnline,
} from '../properties/actuators.js';
import {
  hello,
  lastSeen,
  online,
  Timings,
  vcc,
} from '../properties/sensors.js';

const deviceMeta = (device: Device) => ({
  ...(device.identifier ? { identifier: [...device.identifier.values()] } : {}),
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
  initiallyOnline = false,
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

export const deviceMap = <T extends Record<string, Element>>(devices: T) => ({
  devices: new Element({
    $: 'deviceMap' as const,
    ...devices,
    level: Level.NONE as const,
  }),
});
