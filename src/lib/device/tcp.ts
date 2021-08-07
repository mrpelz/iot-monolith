import { Device } from './main.js';
import { Logger } from '../log.js';
import { TCPTransport } from '../transport/tcp.js';

export class TCPDevice extends Device {
  constructor(logger: Logger, host: string, port: number) {
    const transport = new TCPTransport(host, port, logger);

    super(logger, transport);

    transport.connect();
  }
}
