import { Device } from '../../lib/device/index.js';
import { UDPDevice } from '../../lib/device/udp.js';
import { espNowTransport } from './main.js';

export const testDevice = new UDPDevice(
  'test-device.iot-ng.net.wurstsalat.cloud',
  1337
);
export const shelly1 = new UDPDevice(
  'shelly1.iot-ng.net.wurstsalat.cloud',
  1337
);
export const obiJack = new UDPDevice(
  'obi-jack.iot-ng.net.wurstsalat.cloud',
  1337
);
export const h801 = new UDPDevice('h801.iot-ng.net.wurstsalat.cloud', 1337);
export const shellyi3 = new UDPDevice(
  'shelly-i3.iot-ng.net.wurstsalat.cloud',
  1337
);

export const wifiTestButton = new UDPDevice(
  'esp-now-test-button.iot-ng.net.wurstsalat.cloud',
  1337
);
export const espNowTestButton = new Device(
  espNowTransport,
  Buffer.from([0x70, 0x3, 0x9f, 0x7, 0x83, 0xdf]),
  0
);

export const wifiTestWindowSensor = new UDPDevice(
  'esp-now-test-window-sensor.iot-ng.net.wurstsalat.cloud',
  1337
);
export const espNowTestWindowSensor = new Device(
  espNowTransport,
  Buffer.from([0xdc, 0x4f, 0x22, 0x57, 0xe7, 0xf0]),
  0
);
