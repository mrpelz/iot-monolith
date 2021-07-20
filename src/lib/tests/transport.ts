import { Device, Event, Service } from '../device/main.js';
import { UDPTransport } from '../transport/udp.js';

const transport = new UDPTransport('10.97.0.222', 2222);
const device = new Device(transport);

const event = new Event(Buffer.from([1]));
device.addEvent(event);

const service = new Service(Buffer.from([1]), 2000);
device.addService(service);

// eslint-disable-next-line no-console
event.observable.observe(console.log);

service
  .request()
  // eslint-disable-next-line no-console
  .then(console.log)
  .catch(() => {
    /* noop */
  });
