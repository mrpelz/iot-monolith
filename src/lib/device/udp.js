import { Device } from './index.js';
import { UDPTransport } from '../transport/udp.js';

/**
 * @typedef I_UDPTransportOptions
 * @type {import('../transport/udp').UDPTransportOptions}
 */

export class UDPDevice extends Device {

  /**
   * create instance of Device
   * @param {I_UDPTransportOptions} options configuration object
   */
  constructor(options) {
    const transport = new UDPTransport(options);

    super({
      transport,
      keepAlive: options.keepAlive
    });

    transport.connect();
  }
}
