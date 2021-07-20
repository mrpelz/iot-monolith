import { Device } from './main.js';
import { TCPTransport } from '../transport/tcp.js';

export class TCPDevice extends Device {
  constructor(host: string, port: number) {
    const transport = new TCPTransport(host, port);

    super(transport);

    transport.connect();
  }
}
