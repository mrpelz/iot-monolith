import { UDPTransport, UDPTransportOptions } from '../transport/udp.js';
import { Device } from './index.js';

export class UDPDevice extends Device {
  constructor(options: UDPTransportOptions) {
    const transport = new UDPTransport(options);

    super({
      keepAlive: options.keepAlive,
      transport,
    });

    transport.connect();
  }
}
