import { humanPayload } from '../data.js';
import { EVENT_IDENTIFIER } from '../device/main.js';
import { ESPNow, ESPNowPayload } from '../events/esp-now.js';
import { Input, Logger } from '../log.js';
import { Transport } from './main.js';

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
    super(logger, 6, false);

    this._log = logger.getInput({ head: this.constructor.name });

    event.observable.observe((payload: ESPNowPayload) =>
      this._handleMessage(payload),
    );
  }

  /**
   * handle incoming messages
   */
  private _handleMessage(payload: ESPNowPayload) {
    const { deviceIdentifier, data } = payload;

    this._log.debug(
      () =>
        `msg incoming\nfrom: ${[...deviceIdentifier]
          .map((octet) => octet.toString(16))
          .join(':')}\n\n${humanPayload(data)}`,
    );

    this._ingestIntoDeviceInstances(
      deviceIdentifier,
      Buffer.concat([Buffer.from([EVENT_IDENTIFIER]), data]),
    );
  }
}
