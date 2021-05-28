import { ESPNowEvent, ESPNowTransport } from '../../lib/transport/esp-now.js';
import { UDPDevice } from '../../lib/device/udp.js';

export const olimexEspNowGw = new UDPDevice(
  'olimex-esp32-gateway.iot-ng.net.wurstsalat.cloud',
  1337
);

const espNowEvent = new ESPNowEvent();
olimexEspNowGw.addEvent(espNowEvent);

export const espNowTransport = new ESPNowTransport(espNowEvent);
