import { Device } from './main.js';
import { UDPTransport } from '../transport/udp.js';

export class UDPDevice extends Device {
  constructor(host: string, port: number) {
    const transport = new UDPTransport(host, port);

    super(transport);

    transport.connect();
  }
}
