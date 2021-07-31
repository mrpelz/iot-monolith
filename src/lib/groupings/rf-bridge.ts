import { hello, online } from './metrics.js';
import { ESPNow } from '../events/esp-now.js';
import { ESPNowTransport } from '../transport/esp-now.js';
import { Ev1527Transport } from '../transport/ev1527.js';
import { Rf433 } from '../events/rf433.js';
import { UDPDevice } from '../device/udp.js';
import { metadataStore } from '../hierarchy.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const rfBridge = (host: string, port = 1337) => {
  const device = new UDPDevice(host, port);

  const children = {
    espNowTransport: { $: new ESPNowTransport(device.addEvent(new ESPNow())) },
    ev1527Transport: { $: new Ev1527Transport(device.addEvent(new Rf433())) },
  };

  const result = {
    ...children,
    ...hello(device),
    ...online(device),
  };

  metadataStore.set(result, {
    name: 'rf-bridge',
  });

  return result;
};
