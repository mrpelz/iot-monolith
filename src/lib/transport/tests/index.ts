import { Device, Event, Service } from '../../device/index.js';
import { UDPTransport } from '../udp.js';

const transport = new UDPTransport('10.97.0.222', 2222);
const device = new Device(transport);

const event = new Event(Buffer.from([1]));
device.addEvent(event);

const service = new Service(Buffer.from([1]), 2000);
device.addService(service);

// eslint-disable-next-line no-console
event.observe(console.log);

service
  .request()
  // eslint-disable-next-line no-console
  .then(console.log)
  .catch(() => {
    /* noop */
  });
