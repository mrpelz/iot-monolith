import { rfBridge as _rfBridge } from '../lib/tree/devices/rf-bridge.js';
import { logger } from './logging.js';
import { persistence } from './persistence.js';
import { timings } from './timings.js';

export const rfBridge = _rfBridge(
  logger,
  persistence,
  timings,
  'olimex-esp32-gateway.iot-ng.lan.wurstsalat.cloud'
);

const {
  espNowTransport: { $: _espNowTransport },
  ev1527Transport: { $: _ev1527Transport },
} = rfBridge;

export const espNowTransport = _espNowTransport;
export const ev1527Transport = _ev1527Transport;
