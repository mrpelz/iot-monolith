import { rfBridge as _rfBridge } from '../lib/groupings/rf-bridge.js';

export const rfBridge = _rfBridge(
  'olimex-esp32-gateway.iot-ng.net.wurstsalat.cloud'
);

const {
  espNowTransport: { $: _espNowTransport },
  ev1527Transport: { $: _ev1527Transport },
} = rfBridge;

export const espNowTransport = _espNowTransport;
export const ev1527Transport = _ev1527Transport;
