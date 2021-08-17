import { rfBridge as _rfBridge } from '../lib/groupings/rf-bridge.js';
import { logger } from './logging.js';
import { timings } from './timings.js';

export const rfBridge = _rfBridge(
  logger,
  timings,
  'olimex-esp32-gateway.iot-ng.net.wurstsalat.cloud'
);

const {
  espNowTransport: { $: _espNowTransport },
  ev1527Transport: { $: _ev1527Transport },
} = rfBridge;

export const espNowTransport = _espNowTransport;
export const ev1527Transport = _ev1527Transport;