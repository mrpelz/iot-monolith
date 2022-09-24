import { Device } from './main.js';
import { ESPNowTransport } from '../transport/esp-now.js';
import { Logger } from '../log.js';

export type MACAddress = [number, number, number, number, number, number];

export class ESPNowDevice extends Device<ESPNowTransport> {
  constructor(
    logger: Logger,
    transport: ESPNowTransport,
    macAddress: MACAddress
  ) {
    super(logger, transport, Buffer.from(macAddress), false);
  }
}
