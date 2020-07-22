import { TCPTransport, TCPTransportOptions } from '../transport/tcp.js';
import { Device } from './index.js';

export class TCPDevice extends Device {
  constructor(options: TCPTransportOptions) {
    const transport = new TCPTransport(options);

    super({
      keepAlive: options.keepAlive,
      transport,
    });

    transport.connect();
  }
}
