import { Device } from '../../device/index.js';
import { UDPTransport } from '../udp.js';

const transport = new UDPTransport('10.97.0.222', 2222);
const device = new Device(transport);

const event = device.getEvent(Buffer.from([1]));
const service = device.getService(Buffer.from([1]), 2000);

// eslint-disable-next-line no-console
event.observable.observe(console.log);

service
  .request()
  // eslint-disable-next-line no-console
  .then(console.log)
  .catch(() => {
    /* noop */
  });
