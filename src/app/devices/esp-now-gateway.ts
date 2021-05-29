import { ESPNowEvent, ESPNowTransport } from '../../lib/transport/esp-now.js';
import { UDPDevice } from '../../lib/device/udp.js';

export const gateway = new UDPDevice(
  'olimex-esp32-gateway.iot-ng.net.wurstsalat.cloud',
  1337
);

const event = new ESPNowEvent();
gateway.addEvent(event);

export const transport = new ESPNowTransport(event);
