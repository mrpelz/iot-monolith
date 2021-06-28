import { ESPNow as ESPNowEvent } from '../events/esp-now/index.js';
import { EVENT_IDENTIFIER } from '../device/index.js';
import { ReadOnlyObservable } from '../observable/index.js';
import { Transport } from './index.js';
import { humanPayload } from '../data/index.js';
import { logger } from '../../app/logging.js';

// PACKET FORMAT
//
// event (from device):
// |                        |                                  |                      |                      |
// | MAC address (6 octets) | event id (1–n octets, default 1) | payload (0–n octets) |
// |                        |                        0x00–0xFF |                      |                      |
// |                        |                                  |                      |                      |

export class ESPNowTransport extends Transport {
  private readonly _espNowLog = logger.getInput({ head: 'ESPNowTransport' });

  readonly shouldBeConnected: ReadOnlyObservable<boolean>;

  constructor(event: ESPNowEvent) {
    super(null, 6, false);

    event.observable.observe(({ deviceIdentifier, payload }) =>
      this._handleMessage(deviceIdentifier, payload)
    );
  }

  /**
   * handle incoming messages
   */
  private _handleMessage(deviceIdentifier: Buffer, payload: Buffer) {
    this._espNowLog.debug(
      () =>
        `msg incoming\nfrom: ${[...deviceIdentifier]
          .map((octet) => octet.toString(16))
          .join(':')}\n\n${humanPayload(payload)}`
    );

    this._ingestIntoDeviceInstances(
      deviceIdentifier,
      Buffer.concat([Buffer.from([EVENT_IDENTIFIER]), payload])
    );
  }
}
