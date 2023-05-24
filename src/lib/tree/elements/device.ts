/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Level, matchValue, symbolLevel, symbolSpecies } from '../main-ng.js';
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
import { ESPNowDevice } from '../../device/esp-now.js';
import { Indicator } from '../../services/indicator.js';
import { Persistence } from '../../persistence.js';
import { TCPDevice } from '../../device/tcp.js';
import { UDPDevice } from '../../device/udp.js';

const $ = Symbol('device');

export const espNowDevice = (device: ESPNowDevice) => ({
  ...lastSeen(device.seen),
  ...vcc(device),
  identifier: device.identifier ? [...device.identifier] : undefined,
  [symbolLevel]: Level.DEVICE,
  [symbolSpecies]: $,
  transportType: device.transport.constructor.name,
  type: device.constructor.name,
});

export const ipDevice = (
  device: TCPDevice | UDPDevice,
  persistence: Persistence,
  timings: Timings,
  indicator?: Indicator,
  initiallyOnline?: boolean
) => ({
  ...hello(device, timings.moderate || timings.default),
  ...online(device),
  ...setOnline(device, persistence, initiallyOnline),
  ...resetDevice(device),
  ...(indicator ? identifyDevice(indicator) : {}),
  host: device.transport.host,
  identifier: device.identifier ? [...device.identifier] : undefined,
  port: device.transport.port,
  [symbolLevel]: Level.DEVICE,
  [symbolSpecies]: $,
  transportType: device.transport.constructor.name,
  type: device.constructor.name,
});

export const selectDevice = {
  [symbolLevel]: [matchValue, Level.DEVICE] as const,
  [symbolSpecies]: [matchValue, $] as const,
};
