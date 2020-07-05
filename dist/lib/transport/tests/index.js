import { Device, eventSymbol } from '../../device/index.js';
import { UDPTransport } from '../udp.js';
const transport = new UDPTransport({
    host: '10.97.0.222',
    port: 2222
});
const device = new Device({ transport });
const service = device.getService(Buffer.from([1]));
// eslint-disable-next-line no-console
service.on(eventSymbol, console.log);
service.request()
    // eslint-disable-next-line no-console
    .then(console.log)
    .catch(() => { });
//# sourceMappingURL=index.js.map