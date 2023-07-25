import { Logger } from '../log.js';
import { UDPTransport } from '../transport/udp.js';
import { Device } from './main.js';

export class UDPDevice extends Device<UDPTransport> {
  constructor(logger: Logger, host: string, port: number) {
    const transport = new UDPTransport(host, port, logger);

    super(logger, transport);
  }
}
