import { Bme280 } from '../../../lib/services/bme280/index.js';
import { Hello } from '../../../lib/services/hello/index.js';
import { Input } from '../../../lib/services/input/index.js';
import { Mcp9808 } from '../../../lib/services/mcp9808/index.js';
import { Mhz19 } from '../../../lib/services/mhz19/index.js';
import { Sds011 } from '../../../lib/services/sds011/index.js';
import { Tsl2561 } from '../../../lib/services/tsl2561/index.js';
import { UDPDevice } from '../../../lib/device/udp.js';
import { Veml6070 } from '../../../lib/services/veml6070/index.js';
import { join } from 'path';
import { logger } from '../../logging.js';

// LOGGER
const log = logger.getInput({
  head: join(__dirname, __filename),
});

// DEVICE
export const device = new UDPDevice(
  'test-device.iot-ng.net.wurstsalat.cloud',
  1337
);

device.isOnline.observe((online) => {
  log.info(() => (online ? 'offline' : 'offline'));
});

// EVENTS
const motionEvent = new Input(0);

device.addEvent(motionEvent);

export const motion = motionEvent.observable;

// SERVICES
const bme280Service = new Bme280();
const helloService = new Hello();
const mcp9808Service = new Mcp9808();
const mhz19Service = new Mhz19();
const sds011Service = new Sds011();
const tsl2561Service = new Tsl2561();
const veml6070Service = new Veml6070();

device.addService(bme280Service);
device.addService(helloService);
device.addService(mcp9808Service);
device.addService(mhz19Service);
device.addService(sds011Service);
device.addService(tsl2561Service);
device.addService(veml6070Service);
