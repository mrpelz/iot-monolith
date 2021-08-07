import { Device } from './main.js';
import { Logger } from '../log.js';
import { UDPTransport } from '../transport/udp.js';

export class UDPDevice extends Device {
  constructor(logger: Logger, host: string, port: number) {
    const transport = new UDPTransport(host, port, logger);

    super(logger, transport);

    transport.connect();
  }
}
