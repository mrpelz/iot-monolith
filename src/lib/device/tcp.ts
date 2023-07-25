import { Logger } from '../log.js';
import { TCPTransport } from '../transport/tcp.js';
import { Device } from './main.js';

export class TCPDevice extends Device<TCPTransport> {
  constructor(logger: Logger, host: string, port: number) {
    const transport = new TCPTransport(host, port, logger);

    super(logger, transport);
  }
}
