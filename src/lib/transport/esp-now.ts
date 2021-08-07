import { Input, Logger } from '../log.js';
import { ESPNow } from '../events/esp-now.js';
import { EVENT_IDENTIFIER } from '../device/main.js';
import { Transport } from './main.js';
import { humanPayload } from '../data.js';

// PACKET FORMAT
//
// event (from device):
// |                        |                                  |                      |                      |
// | MAC address (6 octets) | event id (1–n octets, default 1) | payload (0–n octets) |
// |                        |                        0x00–0xFF |                      |                      |
// |                        |                                  |                      |                      |

export class ESPNowTransport extends Transport {
  private readonly _log: Input;

  constructor(logger: Logger, event: ESPNow) {
    super(logger, null, 6, false);

    this._log = logger.getInput({ head: 'ESPNowTransport' });

    event.observable.observe(({ deviceIdentifier, payload }) =>
      this._handleMessage(deviceIdentifier, payload)
    );
  }

  /**
   * handle incoming messages
   */
  private _handleMessage(deviceIdentifier: Buffer, payload: Buffer) {
    this._log.debug(
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
