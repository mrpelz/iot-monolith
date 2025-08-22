import { humanPayload } from '@mrpelz/misc-utils/data';

import { EVENT_IDENTIFIER } from '../device/main.js';
import { Rf433, Rf433Payload } from '../events/rf433.js';
import { Input, Logger } from '../log.js';
import { Transport } from './main.js';

// PACKET FORMAT
//
// event (from device):
// |                                         |                  |
// | address (20 bits, 1st byte left-padded) | payload (4 bits) |
// |                                         |                  |
// |                                         |                  |

export class Ev1527Transport extends Transport {
  private readonly _log: Input;

  constructor(logger: Logger, event: Rf433) {
    super(logger, 3, false);

    this._log = logger.getInput({ head: this.constructor.name });

    event.observable.observe((payload: Rf433Payload) =>
      this._handleMessage(payload),
    );
  }

  /**
   * handle incoming messages
   */
  private _handleMessage(payload: Rf433Payload) {
    if (!payload || payload.protocol !== 1) return;

    const { data, deviceIdentifier } = payload;

    this._log.debug(
      () =>
        `msg incoming\nfrom: ${[...deviceIdentifier]
          .map((octet) => octet.toString(16))
          .join(':')}\n\n${humanPayload(data)}`,
    );

    this._ingestIntoDeviceInstances(
      deviceIdentifier,
      Buffer.concat([Buffer.of(EVENT_IDENTIFIER, 0), data]),
    );
  }
}
