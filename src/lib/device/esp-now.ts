import { Device } from './index.js';
import { ESPNowTransport } from '../transport/esp-now.js';

export type MACAddress = [number, number, number, number, number, number];

export class ESPNowDevice extends Device {
  constructor(transport: ESPNowTransport, macAddress: MACAddress) {
    super(transport, Buffer.from(macAddress), 0);
  }
}
