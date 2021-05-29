import { Button } from '../../../lib/services/button/index.js';
import { Hello } from '../../../lib/services/hello/index.js';
import { Output } from '../../../lib/services/output/index.js';
import { UDPDevice } from '../../../lib/device/udp.js';
import { join } from 'path';
import { logger } from '../../logging.js';
import { resolveAlways } from '../../../lib/oop/index.js';

let on = false;

// LOGGER
const log = logger.getInput({
  head: join(__dirname, __filename),
});

// DEVICE
export const device = new UDPDevice(
  'shelly1.iot-ng.net.wurstsalat.cloud',
  1337
);

// EVENTS
const buttonEvent = new Button(0);

device.addEvent(buttonEvent);

export const button = buttonEvent.observable;

// SERVICES
const helloService = new Hello();
const relayService = new Output(0);

device.addService(helloService);
device.addService(relayService);

button.observe((event) => {
  if (event.down) return;

  on = !on;
  resolveAlways(relayService.request(on));
});

// AUOTMATION
device.isOnline.observe((online) => {
  log.info(() => (online ? 'offline' : 'offline'));

  if (!online) return;
  resolveAlways(relayService.request(on));
});
