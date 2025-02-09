import { rfBridge as _rfBridge } from '../../lib/tree/devices/rf-bridge.js';
import { context } from '../context.js';

export const rfBridge = _rfBridge(
  'olimex-esp32-gateway.iot-ng.lan.wurstsalat.cloud',
  context,
);

const { espNowTransport: _espNowTransport, ev1527Transport: _ev1527Transport } =
  rfBridge;

export const espNowTransport = _espNowTransport;
export const ev1527Transport = _ev1527Transport;
