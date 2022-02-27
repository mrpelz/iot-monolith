/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  Timings,
  hello,
  lastSeen,
  online,
  vcc,
} from '../properties/sensors.js';
import { ESPNowDevice } from '../../device/esp-now.js';
import { TCPDevice } from '../../device/tcp.js';
import { UDPDevice } from '../../device/udp.js';

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
});
