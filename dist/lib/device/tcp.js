import { Device } from './index.js';
import { TCPTransport } from '../transport/tcp.js';
/**
 * @typedef I_TCPTransportOptions
 * @type {import('../transport/tcp.js').TCPTransportOptions}
 */
export class TCPDevice extends Device {
    /**
     * create instance of Device
     * @param {I_TCPTransportOptions} options configuration object
     */
    constructor(options) {
        const transport = new TCPTransport(options);
        super({
            transport,
            keepAlive: options.keepAlive
        });
        transport.connect();
    }
}
//# sourceMappingURL=tcp.js.map